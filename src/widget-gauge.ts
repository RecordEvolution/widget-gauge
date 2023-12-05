import { html, css, LitElement, PropertyValueMap } from 'lit';
import { repeat } from 'lit/directives/repeat.js'
import { property, state } from 'lit/decorators.js';
// import * as echarts from 'echarts';
import { InputData, Data, Dataseries } from './types.js'
import type { EChartsOption, GaugeSeriesOption } from 'echarts';

// echarts.use([GaugeChart, CanvasRenderer]);

export class WidgetGauge extends LitElement {
  
  @property({type: Object}) 
  inputData?: InputData = undefined

  @state()
  private dataSets: Dataseries[] = []

  @state()
  private canvasList: any = {}

  @state()
  private textActive: boolean = false


  @state()
  private numberLabels?: NodeListOf<Element>
  @state()
  private alignerLabels?: NodeListOf<Element>
  @state()
  private titleLabels?: NodeListOf<Element>
  @state()
  private spacers?: NodeListOf<Element>


  resizeObserver: ResizeObserver
  boxes?: HTMLDivElement[]
  origWidth: number = 0
  origHeight: number = 0
  template: EChartsOption
  modifier: number = 1
  constructor() {
    super()
    this.resizeObserver = new ResizeObserver(this.adjustSizes.bind(this))
    this.resizeObserver.observe(this)

    this.template = {
      title: {
        text: 'Waterfall',
        left: 'center',
        textStyle: {
          fontSize: 10
        }
      },
      series: [
        {
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          min: 33,
          max: 99,
          radius: '120%',
          center: ['50%', '90%'],
          progress: {
            show: true,
            clip: true,
            width: 50,
            roundCap: false,
            itemStyle: {
              color: 'auto'
            }
          },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          anchor: { show: false },
          pointer: { show: false },
          detail: {
            valueAnimation: false,
            fontSize: 25,
            offsetCenter: [0, '-7%'],
            color: 'inherit',
            formatter: (val) => isNaN(val) ? '-' : val.toFixed()
          },
          title: {
            offsetCenter: [0, '-35%'],
            fontSize: 20
          },
          data: [
            {
              value: 70,
            }
          ]
        } as GaugeSeriesOption,
        {
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          min: 33,
          max: 99,
          radius: '125%',
          center: ['50%', '90%'],
          axisLine: {
            lineStyle: {
              width: 20,
              color: [
                [0.3, '#67e0e3'],
                [0.7, '#37a2da'],
                [1, '#fd666d']
              ]
            }
          },
          axisTick: { show: false},
          splitLine: {
            length: 15,
            distance: -25,
            lineStyle: {
              width: 2,
              color: 'auto',
            }
          },
          axisLabel: {
            distance: -20,
            color: '#999',
            rotate: 'tangential',
            fontSize: 12,
          },
        } as GaugeSeriesOption,
      ]
    };

  }

  update(changedProperties: Map<string, any>) {
    changedProperties.forEach((oldValue, propName) => {
      if (propName === 'inputData') {
        this.transformData()
      }
    })

    this.sizingSetup()

    super.update(changedProperties)
  }

  protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
      this.sizingSetup()
  }

  sizingSetup() {
    if (this.origWidth !== 0 && this.origHeight !== 0) return

    this.boxes = Array.from(this?.shadowRoot?.querySelectorAll('.chart') as NodeListOf<HTMLDivElement>)

    this.origWidth = this.boxes?.map(b => b.getBoundingClientRect().width).reduce((p, c) => c > p ? c : p, 0 ) ?? 0
    this.origHeight = this.boxes?.map(b => b.getBoundingClientRect().height).reduce((p, c) => c > p ? c : p, 0 ) ?? 0

    if (this.origWidth > 0) this.origWidth += 16
    if (this.origHeight > 0) this.origHeight += 16
    // console.log('OrigWidth', this.origWidth, this.origHeight)

  }

  adjustSizes() {
    // console.log('adjustSizes')
    // if (!this.origHeight) return
    const container = this.shadowRoot?.querySelector('.gauge-container') as HTMLDivElement
    const userWidth = container.getBoundingClientRect().width
    const userHeight = container.getBoundingClientRect().height
    const count = this.dataSets.length

    const width = this.origWidth
    const height = this.origHeight

    const fits = []
    for (let c = 1; c <= count; c++) {
      const r = Math.ceil(count/c)
      const uwgap = (userWidth - 12 * (c-1))
      const uhgap = (userHeight - 12 * (r-1))
      const m = uwgap / width / c
      const size = m * m * width * height * count
      if (r * m * height < uhgap) fits.push({c, m, size, width, height, userWidth, userHeight})
    }

    for (let r = 1; r <= count; r++) {
      const c = Math.ceil(count/r)
      const uwgap = (userWidth - 12 * (c-1))
      const uhgap = (userHeight - 12 * (r-1))
      const m = uhgap / height / r
      const size = m * m * width * height * count
      if (c * m * width < uwgap) fits.push({r, m, size, width, height, userWidth, userHeight})
    }

    const maxSize = fits.reduce((p, c) => c.size < p ? p : c.size, 0)
    const fit = fits.find(f => f.size === maxSize)
    const modifier = (fit?.m ?? 0)

    // console.log('FITS', fits, 'modifier', modifier, 'cols',fit?.c, 'rows', fit?.r, 'new size', fit?.size.toFixed(0), 'total space', (userWidth* userHeight).toFixed(0))

    this.boxes?.forEach(box => box.setAttribute("style", `width:${modifier*width}px; height:${modifier*height}px`))

    this.modifier = modifier

    this.textActive = true
    for (const canvas in this.canvasList) {
      this.canvasList[canvas].resize()
    }
    this.applyData()

  }

  async transformData() {
    if(!this?.inputData) return
    this.dataSets = []
    this.inputData.dataseries?.sort((a, b) => a.order - b.order).forEach(ds => {

      // pivot data
      const distincts = [...new Set(ds.data.map((d: Data) => d.pivot))]
      if (distincts.length > 1) {
        distincts.forEach((piv) => {
          const pds: any = {
            label: `${ds.label} ${piv}`,
            order: ds.order,
            unit: ds.unit,
            averageLatest: ds.averageLatest,
            valueColor: ds.valueColor,
            sections: ds.sections,
            backgroundColors: ds.backgroundColors,
            data: ds.data.filter(d => d.pivot === piv)
          }
          this.dataSets.push(pds)
        })
      } else {
        this.dataSets.push(ds)
      }
    })

    // filter latest values and calculate average
    this.dataSets.forEach(ds => {
      ds.data = ds.data.splice(-ds.averageLatest ?? -1)
      ds.needleValue = ds.data.map(d => d.value).reduce(( p, c ) => p + c, 0) / ds.data.length ?? ds.sections[0]

      ds.range = ds.sections[ds.sections.length -1] - ds.sections[0]
      ds.ranges = ds.sections.map((v, i, a) => v - (a?.[i-1] ?? 0)).slice(1)
    })

    this.requestUpdate(); await this.updateComplete

    // console.log('Gauge Datasets', this.dataSets)

    // create charts
    if (!Object.entries(this.canvasList).length) {
      this.createChart()
    }

    // update chart info
    this.applyData()
  }

  applyData() {
    const modifier = this.modifier
    for (const ds of this.dataSets) {

      // const option = this.canvasList[ds.label].getOption()
      const option = this.template
      // @ts-ignore
      const ga = option.series[0],
      // @ts-ignore
        ga2 = option.series[1]

      // Title
      // @ts-ignore
      option.title.text = ds.label
      // @ts-ignore
      option.title.textStyle.fontSize = 22 * modifier

      // Needle
      ga.data[0].value = ds.needleValue
      ga.data[0].name = ds.unit
      ga.title.fontSize = 20 * modifier
      ga.title.color = ds.valueColor
      ga.detail.color = ds.valueColor
      ga.detail.fontSize = 40 * modifier
      // ga.anchor.itemStyle.color = ds.valueColor
      // ga.pointer.itemStyle.color = ds.valueColor

      // Axis
      ga2.min = Math.min(...ds.sections)
      ga2.max = Math.max(...ds.sections)
      ga.min = ga2.min
      ga.max = ga2.max
      const colorSections = ds.backgroundColors.map((b, i) => [(ds.sections[i+1] - ga.min) / ds.range, b])
      ga2.axisLine.lineStyle.width = 8 * modifier
      ga2.axisLine.lineStyle.color = colorSections
      ga2.axisLabel.fontSize = 20 * modifier
      // ga2.axisLabel.color = ds.valueColor
      ga2.axisLabel.distance = -24 * modifier
      ga2.splitLine.length = 16 * modifier
      ga2.splitLine.distance = -16 * modifier

      // Progress
      let progressColor: string = ds.backgroundColors[ds.backgroundColors.length -1]
      for (const [i, s] of ds.sections.entries()) {
        if (s > ds.needleValue) {
          progressColor = ds.backgroundColors[i - 1] ?? ds.backgroundColors[0]
          break
        }
      }
      ga.progress.itemStyle.color = progressColor
      ga.progress.width = 80 * modifier

      // Apply
      this.canvasList[ds.label].setOption(option)
    }

  }

  createChart() {
    this.dataSets.forEach(ds => {
      const canvas = this.shadowRoot?.querySelector(`[name="${ds.label}"]`) as HTMLCanvasElement;
      if (!canvas) return
      // @ts-ignore
      this.canvasList[ds.label] = echarts.init(canvas);
      this.canvasList[ds.label].setOption(JSON.parse(JSON.stringify(this.template)))
      
    })

  }

  static styles = css`
    :host {
      display: block;
      color: var(--re-text-color, #000);
      font-family: sans-serif;
      box-sizing: border-box;
      position: relative;
      margin: auto;
    }

    .paging:not([active]) { display: none !important; }

    .wrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      padding: 16px;
      box-sizing: border-box;
    }
    .gauge-container {
      display: flex;
      flex: 1;
      flex-wrap: wrap;
      overflow: hidden;
      position: relative;
      gap: 12px;
    }

    header {
      display: flex;
      flex-direction: column;
      margin: 0 0 16px 0;
    }
    h3 {
      margin: 0;
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    p {
      margin: 10px 0 0 0;
      max-width: 300px;
      font-size: 14px;
      line-height: 17px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .chart {
      width: 600px; /* will be overriden by adjustSizes */
      height: 300px;
    }

  `;

  render() {
    return html`
      <div class="wrapper">
        <header>
          <h3 class="paging" ?active=${this.inputData?.settings?.title}>${this.inputData?.settings?.title}</h3>
          <p class="paging" ?active=${this.inputData?.settings?.subTitle}>${this.inputData?.settings?.subTitle}</p>
        </header>
        <div class="gauge-container">
          ${repeat(this.dataSets, ds => ds.label, ds => html`
            <div name="${ds.label}" class="chart" style="min-width: 600px; min-height: 300px; width: 600px; height: 300px;"></div>
          `)}
        </div>
      </div>
    `;
  }
}

window.customElements.define('widget-gauge', WidgetGauge);
