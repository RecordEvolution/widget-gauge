import { html, css, LitElement, PropertyValueMap } from 'lit';
import { repeat } from 'lit/directives/repeat.js'
import { property, state } from 'lit/decorators.js';
import { Chart } from 'chart.js/auto';
import { InputData, Data, Dataseries } from './types.js'

export class WidgetGauge extends LitElement {
  
  @property({type: Object}) 
  inputData?: InputData = undefined

  @state()
  private gaugeTitle: string = 'Gauge-chart';

  @state()
  private gaugeDescription: string = 'This is a Gauge-chart from the RE-Dashboard';

  @state()
  private dataSets: Dataseries[] = []

  @state()
  private canvasList: any = {}


  @state()
  private numberLabels?: NodeListOf<Element>
  @state()
  private titleLabels?: NodeListOf<Element>

  resizeObserver: ResizeObserver
  constructor() {
    super()
    this.resizeObserver = new ResizeObserver((ev: ResizeObserverEntry[]) => {
      
      const width: number = ev[0].contentRect.width
      const height: number = ev[0].contentRect.height + 30
      
      this.numberLabels?.forEach(n => {
        n.setAttribute("style", `width: ${width}px; top: ${height}px`)
      })

      this.titleLabels?.forEach(n => {
          n.setAttribute("style", `width: ${width}px; top: ${0}px`)
        })
    })
  }

  updated(changedProperties: Map<string, any>) {
    changedProperties.forEach((oldValue, propName) => {
      if (propName === 'inputData') {
        this.applyInputData()
      }
    })
  }

  async applyInputData() {

    if(!this?.inputData) return

    this.gaugeTitle = this.inputData.settings.title ?? this.gaugeTitle
    this.gaugeDescription = this.inputData.settings.subTitle ?? this.gaugeDescription
    this.dataSets = []
    this.inputData.dataseries.forEach(ds => {

      // pivot data
      const distincts = [...new Set(ds.data.map((d: Data) => d.pivot))]
      if (distincts.length > 1) {
        distincts.forEach((piv) => {
          const pds: any = {
            label: `${ds.label} ${piv}`,
            order: ds.order,
            needleColor: ds.needleColor,
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
      ds.data.splice(ds.averageLatest ?? 1)
      ds.needleValue = ds.data.map(d => d.value).reduce(( p, c ) => p + c, 0) / ds.data.length
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
    this.dataSets.forEach(ds => {
      if (this.canvasList[ds.label]) {
        this.canvasList[ds.label].data.datasets[0].data = ds.ranges
        this.canvasList[ds.label].data.datasets[0].backgroundColor = ds.backgroundColors

        this.canvasList[ds.label].update('none')
      }
    })
  }

  drawNeedle(chart: Chart) {
      const ds: Dataseries | undefined = this.dataSets.find(ds => chart.data.datasets[0].label === ds.label)
      if (!ds) return

      const angle = Math.PI + (ds.needleValue - ds.sections[0]) / ds.range * Math.PI
      const {ctx} = chart;
      const cw = chart.canvas.offsetWidth;
      const ch = chart.canvas.offsetHeight;
      // const cw = this.offsetWidth;
      // const ch = this.offsetHeight;
      const cx = cw / 2;
      const cy = ch - 6;

      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.lineTo(ch - 20, 0);
      ctx.lineTo(0, 3);
      ctx.fillStyle = ds.needleColor;
      ctx.fill();
      ctx.rotate(-angle);
      ctx.translate(-cx, -cy);
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
  }

  createChart() {
    this.dataSets.forEach(ds => {
      const canvas = this.shadowRoot?.querySelector(`[name="${ds.label}"]`) as HTMLCanvasElement;
      this.resizeObserver.observe(canvas)

      if (!canvas) return
      console.log('using chart for ', ds)
      this.canvasList[ds.label] = new Chart(
        canvas,
        {
          type: 'doughnut',
          data: {
            datasets: [{
              label: ds.label,
              data: ds.ranges,
              backgroundColor: ds.backgroundColors
            }]
          },
          options: {
            responsive: true,
            aspectRatio: 2,
            layout: {
              padding: {
                bottom: 3
              }
            },
            rotation: -90,
            cutout: '50%',
            circumference: 180,
            animation: {
              duration: 200,
              animateRotate: false,
              animateScale: true
            }
          },
  
          plugins: [{
            id: 'doughnut',
            afterDraw: this.drawNeedle.bind(this)
          }]
        }
      ) as Chart
    })

    this.numberLabels = this?.shadowRoot?.querySelectorAll('.values')
    this.titleLabels = this?.shadowRoot?.querySelectorAll('.label')
  }

  static styles = css`
    :host {
      display: block;
      color: var(--widget-gauge-text-color, #000);
      font-family: sans-serif;
      padding: 16px;
      box-sizing: border-box;
      position: relative;
      margin: auto;
    }

    .wrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
    }
    .gauge-container {
      display: flex;
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    .sizer {
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    .single-gauge {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
      position: relative;
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
    }
    #currentValue {
      margin: 0 auto;
      text-align: center;
      font-size: x-large;
      font-weight: 600;
    }

    .spacer {
      height: 30px;
    }

    .values {
      display: flex;
      position: absolute;
    }

    .scale-value {
      text-align: center;
      font-size: large;
      font-weight: 400;
      margin: 0px 11%;
    }

    .label {
      text-align: center;
      position: absolute;
    }
  `;

  render() {
    return html`
      <div class="wrapper">
        <header>
          <h3>${this.gaugeTitle}</h3>
          <p>${this.gaugeDescription}</p>
        </header>
        <div class="gauge-container">
          ${repeat(this.dataSets, ds => ds.label, ds => html`
              <div class="single-gauge">
                <div class="label">${ds.label}</div>
                <div class="spacer"></div>
                <div class="sizer">
                  <canvas name="${ds.label}"></canvas>
                </div>
                <div class="spacer"></div>
                  <div class="values">
                    <div class="scale-value">${ds.sections[0]}</div>
                    <div id="currentValue">${ds.needleValue.toFixed(0)}</div>
                    <div class="scale-value">${ds.sections[ds.sections.length-1]}</div>
                  </div>
              </div>
          `)}
        </div>
      </div>
    `;
  }
}

window.customElements.define('widget-gauge', WidgetGauge);
