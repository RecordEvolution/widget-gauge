import { html, css, LitElement, PropertyValueMap } from 'lit'
import { property, state } from 'lit/decorators.js'
// import * as echarts from 'echarts'
import type { EChartsOption, GaugeSeriesOption } from 'echarts'
import { GaugeChartConfiguration } from './definition-schema.js'

// echarts.use([GaugeChart, CanvasRenderer]);

type Dataseries = Exclude<GaugeChartConfiguration['dataseries'], undefined>[number]
type Data = Exclude<Dataseries['data'], undefined>[number]

export class WidgetGauge extends LitElement {
    @property({ type: Object })
    inputData?: GaugeChartConfiguration

    @state()
    private dataSets: Dataseries[] = []

    @state()
    private canvasList: any = {}

    private resizeObserver: ResizeObserver
    boxes?: HTMLDivElement[]
    origWidth: number = 0
    origHeight: number = 0
    template: any
    modifier: number = 1
    version: string = 'versionplaceholder'
    gaugeContainer: HTMLDivElement | null | undefined
    constructor() {
        super()
        this.resizeObserver = new ResizeObserver(this.adjustSizes.bind(this))

        this.template = {
            title: {
                text: 'Gauge',
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
                    radius: '121%',
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
                        color: 'inherit'
                    },
                    title: {
                        offsetCenter: [0, '-35%'],
                        fontSize: 20
                    },
                    data: [
                        {
                            value: 70
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
                                [0.2, '#67e0e3'],
                                [0.8, '#37a2da'],
                                [1, '#fd666d']
                            ]
                        }
                    },
                    axisTick: { show: false },
                    splitLine: {
                        length: 15,
                        distance: -25,
                        lineStyle: {
                            width: 2,
                            color: 'auto'
                        }
                    },
                    axisLabel: {
                        distance: -20,
                        color: '#666',
                        rotate: 'tangential',
                        fontSize: 12
                    }
                } as GaugeSeriesOption
            ]
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        if (this.resizeObserver) {
            this.resizeObserver.disconnect()
        }
    }

    update(changedProperties: Map<string, any>) {
        changedProperties.forEach((oldValue, propName) => {
            if (propName === 'inputData' && this.gaugeContainer) {
                this.transformData()
                this.adjustSizes()
            }
        })

        super.update(changedProperties)
    }

    protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        this.resizeObserver.observe(this.shadowRoot?.querySelector('.wrapper') as HTMLDivElement)
        this.gaugeContainer = this.shadowRoot?.querySelector('.gauge-container')
        this.sizingSetup()
        this.transformData()
        this.adjustSizes()
    }

    sizingSetup() {
        if (this.origWidth !== 0 && this.origHeight !== 0) return

        this.boxes = Array.from(this?.shadowRoot?.querySelectorAll('.chart') as NodeListOf<HTMLDivElement>)
        if (!this.boxes.length) return
        this.origWidth =
            this.boxes?.map((b) => b.getBoundingClientRect().width).reduce((p, c) => (c > p ? c : p), 0) ?? 0
        this.origHeight =
            this.boxes?.map((b) => b.getBoundingClientRect().height).reduce((p, c) => (c > p ? c : p), 0) ?? 0
    }

    adjustSizes() {
        // if (!this.origHeight) return
        if (!this.gaugeContainer) return
        const userWidth = this.gaugeContainer.getBoundingClientRect().width
        const userHeight = this.gaugeContainer.getBoundingClientRect().height
        const count = this.dataSets.length

        const width = this.origWidth
        const height = this.origHeight
        if (!userHeight || !userWidth || !width || !height) return
        const fits = []
        for (let c = 1; c <= count; c++) {
            const r = Math.ceil(count / c)
            const uwgap = userWidth - 12 * (c - 1)
            const uhgap = userHeight - 12 * (r - 1)
            const m = uwgap / width / c
            const size = m * m * width * height * count
            if (r * m * height <= uhgap) fits.push({ c, r, m, size, uwgap, uhgap })
        }

        for (let r = 1; r <= count; r++) {
            const c = Math.ceil(count / r)
            const uwgap = userWidth - 12 * (c - 1)
            const uhgap = userHeight - 12 * (r - 1)
            const m = uhgap / height / r
            const size = m * m * width * height * count
            if (c * m * width <= uwgap) fits.push({ c, r, m, size, uwgap, uhgap })
        }

        const maxSize = fits.reduce((p, c) => (c.size < p ? p : c.size), 0)
        const fit = fits.find((f) => f.size === maxSize)
        const modifier = fit?.m ?? 0

        // console.log(
        //     'FITS count',
        //     userWidth,
        //     count,
        //     fit,
        //     fits,
        //     'new size',
        //     fit?.size.toFixed(0),
        //     'total space',
        //     (userWidth * userHeight).toFixed(0),
        //     this.boxes
        // )
        this.boxes = Array.from(this?.shadowRoot?.querySelectorAll('.chart') as NodeListOf<HTMLDivElement>)

        this.boxes?.forEach((box) =>
            box.setAttribute('style', `width:${modifier * width}px; height:${modifier * height}px`)
        )

        this.modifier = modifier

        for (const canvas in this.canvasList) {
            this.canvasList[canvas].resize()
        }
        this.applyData()
    }

    async transformData() {
        if (!this?.inputData) return
        this.dataSets = []
        this.inputData.dataseries?.forEach((ds) => {
            // pivot data
            const distincts = [...new Set(ds?.data?.map((d: Data) => d.pivot))]

            distincts.forEach((piv) => {
                const prefix = piv ? `${piv} - ` : ''
                const pds: any = {
                    label: prefix + `${ds.label ?? ''}`,
                    unit: ds.unit,
                    advanced: ds.advanced,
                    valueColor: ds.valueColor,
                    sections: ds.sections,
                    data: distincts.length === 1 ? ds.data : ds?.data?.filter((d) => d.pivot === piv)
                }
                this.dataSets.push(pds)
            })
        })

        this.setupCharts()
    }

    applyData() {
        const modifier = this.modifier
        this.dataSets.forEach((d) => {
            d.label ??= ''
        })

        this.dataSets.sort((a, b) => ((a.label as string) > (b.label as string) ? 1 : -1))
        this.requestUpdate()

        for (const ds of this.dataSets) {
            // compute derivative values
            // filter latest values and calculate average
            ds.advanced ??= {}
            if (typeof ds.advanced?.averageLatest !== 'number' || isNaN(ds.advanced?.averageLatest))
                ds.advanced.averageLatest = 1
            const data = ds?.data?.slice(-ds.advanced?.averageLatest || -1) ?? []
            const values = (data?.map((d) => d.value)?.filter((p) => p !== undefined) ?? []) as number[]
            const average = values.reduce((p, c) => p + c, 0) / values.length

            ds.needleValue = isNaN(average) ? ds.sections?.sectionLimits?.[0] : average

            ds.range =
                (ds.sections?.sectionLimits?.[ds.sections?.sectionLimits?.length - 1] ?? 100) -
                (ds.sections?.sectionLimits?.[0] ?? 0)
            if (isNaN(ds.range as number)) ds.range = 100
            ds.ranges = ds.sections?.sectionLimits?.map((v, i, a) => v - (a?.[i - 1] ?? 0)).slice(1) ?? []

            // const option = this.canvasList[ds.label].getOption()
            const option = structuredClone(this.template)
            const ga = option.series[0],
                ga2 = option.series[1]

            // Title
            option.title.text = ds.label
            option.title.textStyle.fontSize = 32 * modifier

            // Needle
            // Check age of data Latency
            const tsp = Date.parse(ds?.data?.[0]?.tsp ?? '')
            if (isNaN(tsp)) {
                const now = new Date().getTime()
                if (now - tsp > (ds.advanced?.maxLatency ?? Infinity) * 1000) ds.needleValue = undefined
            }

            ga.data[0].value = ds.needleValue
            ga.data[0].name = ds.unit
            ga.title.fontSize = 32 * modifier
            ga.title.color = ds.valueColor ?? 'black'
            ga.detail.color = ds.valueColor ?? 'black'
            ga.detail.fontSize = 60 * modifier
            ga.detail.formatter = (val: number) => (isNaN(val) ? '-' : val.toFixed(0))
            // ga.anchor.itemStyle.color = ds.valueColor
            // ga.pointer.itemStyle.color = ds.valueColor

            // Axis
            ga2.min = ds.sections?.sectionLimits?.length ? Math.min(...ds.sections?.sectionLimits) : 0
            ga2.max = ds.sections?.sectionLimits?.length ? Math.max(...ds.sections?.sectionLimits) : 100
            ga.min = ga2.min
            ga.max = ga2.max
            const colorSections = ds.sections?.backgroundColors
                ?.map((b, i) => [
                    ((ds.sections?.sectionLimits?.[i + 1] ?? ga.min) - ga.min) / (ds.range as number),
                    b
                ])
                .filter(([s]) => !isNaN(s as number))
            ga2.axisLine.lineStyle.width = 8 * modifier
            ga2.axisLine.lineStyle.color = colorSections?.length
                ? colorSections
                : ga2.axisLine.lineStyle.color
            ga2.axisLabel.fontSize = 20 * modifier
            // ga2.axisLabel.color = ds.valueColor
            ga2.axisLabel.distance = -24 * modifier
            ga2.splitLine.length = 16 * modifier
            ga2.splitLine.distance = -16 * modifier

            // Progress
            let progressColor =
                ds.sections?.backgroundColors?.[ds.sections?.backgroundColors.length - 1] ?? 'green'
            for (const [i, s] of ds.sections?.sectionLimits?.entries() ?? []) {
                if (s > (ds.needleValue as number)) {
                    progressColor =
                        ds.sections?.backgroundColors?.[i - 1] ??
                        ds.sections?.backgroundColors?.[0] ??
                        'green'
                    break
                }
            }
            ga.progress.itemStyle.color = progressColor
            ga.progress.width = 80 * modifier
            // Apply
            this.canvasList[ds.label ?? '']?.setOption(option)
        }
    }

    setupCharts() {
        // remove the gauge canvases of non provided data series
        for (const label in this.canvasList) {
            const ex = this.dataSets.find((ds) => ds.label === label)
            if (!ex) {
                delete this.canvasList[label]
                const containerDiv = this.gaugeContainer?.querySelector(`[name="${label}"]`)
                containerDiv?.remove()
            }
        }

        this.dataSets.forEach((ds) => {
            if (this.canvasList[ds.label ?? '']) return
            const newCanvas = document.createElement('div')
            newCanvas.setAttribute('name', ds.label ?? '')
            newCanvas.setAttribute('class', 'chart')
            newCanvas.setAttribute(
                'style',
                `min-width: 600px; min-height: 400px; width: 600px; height: 400px;`
            )

            this.gaugeContainer!.appendChild(newCanvas)
            // @ts-ignore
            this.canvasList[ds.label ?? ''] = echarts.init(newCanvas)
            this.canvasList[ds.label ?? ''].setOption(structuredClone(this.template))
        })
        this.sizingSetup()
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

        .paging:not([active]) {
            display: none !important;
        }

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
            justify-content: center;
            align-items: center;
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
            color: var(--re-text-color, #000) !important;
        }
        p {
            margin: 10px 0 0 0;
            max-width: 300px;
            font-size: 14px;
            line-height: 17px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: var(--re-text-color, #000) !important;
        }

        .chart {
            width: 600px; /* will be overriden by adjustSizes */
            height: 400px;
        }

        .no-data {
            font-size: 20px;
            color: var(--re-text-color, #000);
            display: flex;
            height: 100%;
            width: 100%;
            text-align: center;
            align-items: center;
            justify-content: center;
        }
    `

    render() {
        return html`
            <div class="wrapper">
                <header class="paging" ?active=${this.inputData?.title || this.inputData?.subTitle}>
                    <h3 class="paging" ?active=${this.inputData?.title}>${this.inputData?.title}</h3>
                    <p class="paging" ?active=${this.inputData?.subTitle}>${this.inputData?.subTitle}</p>
                </header>
                <div class="paging no-data" ?active=${!this.dataSets.length}>No Data</div>
                <div class="gauge-container"></div>
            </div>
        `
    }
}

window.customElements.define('widget-gauge-versionplaceholder', WidgetGauge)
