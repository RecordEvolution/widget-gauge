import { html, css, LitElement, PropertyValueMap } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { GaugeChartConfiguration } from './definition-schema.js'

import * as echarts from 'echarts/core'
import { TooltipComponent } from 'echarts/components'
import { GaugeChart, GaugeSeriesOption } from 'echarts/charts'
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers'
import { EChartsOption, SeriesOption } from 'echarts'

echarts.use([TooltipComponent, GaugeChart, CanvasRenderer])

type Dataseries = Exclude<GaugeChartConfiguration['dataseries'], undefined>[number]
type Data = Exclude<Dataseries['data'], undefined>[number]

@customElement('widget-gauge-versionplaceholder')
export class WidgetGauge extends LitElement {
    @property({ type: Object })
    inputData?: GaugeChartConfiguration

    @property({ type: Object })
    themeObject?: any

    @property({ type: String })
    themeName?: string

    @state()
    private dataSets: Dataseries[] = []

    @state()
    private canvasList: any = {}

    @state()
    private themeBgColor?: string

    @state()
    private themeColor?: string

    private resizeObserver: ResizeObserver

    boxes?: HTMLDivElement[]
    origWidth: number = 0
    origHeight: number = 0
    template: EChartsOption
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
                    radius: '140%',
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
                        text: 'Gauge A',
                        offsetCenter: [0, '-35%'],
                        fontSize: 20,
                        show: true
                    },
                    data: [
                        {
                            value: 70,
                            name: 'Value Name'
                        }
                    ]
                } as SeriesOption,
                {
                    type: 'gauge',
                    name: 'Gauge B',
                    startAngle: 180,
                    endAngle: 0,
                    min: 33,
                    max: 99,
                    radius: '145%',
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
                    title: {
                        text: 'Gauge B',
                        offsetCenter: [0, '-35%'],
                        fontSize: 20,
                        show: true
                    },
                    axisLabel: {
                        distance: -20,
                        color: '#666',
                        rotate: 'tangential',
                        fontSize: 12
                    }
                } as SeriesOption
            ]
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        if (this.resizeObserver) {
            this.resizeObserver.disconnect()
        }
    }

    update(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        if (changedProperties.has('inputData') && this.gaugeContainer) {
            this.transformData()
        }

        if (changedProperties.has('themeObject')) {
            this.registerTheme(this.themeName, this.themeObject)
        }

        if (changedProperties.has('themeName')) {
            this.registerTheme(this.themeName, this.themeObject)
            this.deleteCharts()
            this.setupCharts()
        }
        super.update(changedProperties)
    }

    protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        this.resizeObserver.observe(this.shadowRoot?.querySelector('.wrapper') as HTMLDivElement)
        this.gaugeContainer = this.shadowRoot?.querySelector('.gauge-container')
        this.transformData()
    }

    registerTheme(themeName?: string, themeObject?: any) {
        if (!themeObject || !themeName) return

        echarts.registerTheme(themeName, this.themeObject)
    }

    sizingSetup() {
        if (this.origWidth !== 0 && this.origHeight !== 0) return

        this.boxes =
            Array.from(this?.shadowRoot?.querySelectorAll('.chart-wrapper') as NodeListOf<HTMLDivElement>) ??
            []
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

        const chartW = this.origWidth
        const chartH = this.origHeight
        if (!userHeight || !userWidth || !chartW || !chartH) return
        const fits = []
        for (let c = 1; c <= count; c++) {
            const r = Math.ceil(count / c)
            const netWidth = userWidth - 24 * (c - 1) // subtract the gaps between the charts
            const netHeight = userHeight - 24 * (r - 1)
            const m = netWidth / chartW / c // modifying factor to make it fit
            const size = m * m * chartW * chartH * count // screen space used by charts overall
            if (r * m * chartH <= netHeight) fits.push({ c, r, m, size, uwgap: netWidth, uhgap: netHeight })
        }

        for (let r = 1; r <= count; r++) {
            const c = Math.ceil(count / r)
            const netWidth = userWidth - 24 * (c - 1)
            const netHeight = userHeight - 24 * (r - 1)
            const m = netHeight / chartH / r
            const size = m * m * chartW * chartH * count
            if (c * m * chartW <= netWidth) fits.push({ c, r, m, size, uwgap: netWidth, uhgap: netHeight })
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
            box.setAttribute('style', `width:${modifier * chartW}px; height:${modifier * (chartH - 25)}px`)
        )

        this.modifier = modifier

        for (const canvas in this.canvasList) {
            this.canvasList[canvas].echart.resize()
        }
        this.applyData()
    }

    async transformData() {
        // console.log('Transforming data', this.inputData?.dataseries)
        this.dataSets = []
        if (!this?.inputData) return
        this.inputData.dataseries
            ?.sort((a, b) => ((a.label ?? '') > (b.label ?? '') ? 1 : -1))
            .forEach((ds) => {
                // pivot data
                const distincts = [...new Set(ds?.data?.map((d: Data) => d.pivot))]

                distincts.forEach((piv) => {
                    const prefix = piv ?? ''
                    const label = ds.label ?? ''
                    const pds: any = {
                        label: prefix + (!!prefix && !!label ? ' - ' : '') + label,
                        unit: ds.unit,
                        precision: ds.precision,
                        advanced: ds.advanced,
                        valueColor: ds.valueColor,
                        sections: ds.sections,
                        data: distincts.length === 1 ? ds.data : ds?.data?.filter((d) => d.pivot === piv)
                    }
                    this.dataSets.push(pds)
                })
            })

        this.setupCharts()
        this.adjustSizes()
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
            ds.label ??= ''
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
            const option = window.structuredClone(this.template)
            const seriesArr = option.series as GaugeSeriesOption[]
            const ga: any = seriesArr?.[0],
                ga2: any = seriesArr?.[1]

            // Needle
            // Check age of data Latency
            const tsp = Date.parse(ds?.data?.[0]?.tsp ?? '')
            if (isNaN(tsp)) {
                const now = new Date().getTime()
                if (now - tsp > (ds.advanced?.maxLatency ?? Infinity) * 1000) ds.needleValue = undefined
            }

            ga.data[0].value = ds.needleValue
            ga.data[0].name = ds.unit
            ga.title.fontSize = 25 * modifier
            ga.title.color = ds.valueColor ?? this.themeColor
            ga.detail.color = ds.valueColor ?? this.themeColor
            ga.detail.fontSize = 40 * modifier
            ga.detail.formatter = (val: number) =>
                isNaN(val) ? '-' : val.toFixed(Math.floor(ds.precision ?? 0))
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
            let progressColor = ds.sections?.backgroundColors?.[ds.sections?.backgroundColors.length - 1]
            for (const [i, s] of ds.sections?.sectionLimits?.entries() ?? []) {
                if (s > (ds.needleValue as number)) {
                    progressColor =
                        ds.sections?.backgroundColors?.[i - 1] ?? ds.sections?.backgroundColors?.[0]
                    break
                }
            }
            ga.progress.itemStyle.color = progressColor
            ga.progress.width = 60 * modifier
            // Apply
            const titleElement = this.canvasList[ds.label]?.title
            titleElement.style.fontSize = String(20 * modifier) + 'px'
            titleElement.style.maxWidth = String(300 * modifier) + 'px'
            titleElement.style.height = String(25 * modifier) + 'px'
            titleElement.textContent = ds.label ?? ''

            this.canvasList[ds.label]?.echart.setOption(option)
        }
    }

    deleteCharts() {
        for (const label in this.canvasList) {
            this.canvasList[label].echart.dispose()
            this.canvasList[label].wrapper?.remove()
            delete this.canvasList[label]
        }
    }

    setupCharts() {
        // remove the gauge canvases of non provided data series
        for (const label in this.canvasList) {
            const ex = this.dataSets.find((ds) => ds.label === label)
            if (!ex) {
                this.canvasList[label].echart.dispose()
                this.canvasList[label].wrapper?.remove()
                delete this.canvasList[label]
            }
        }

        this.dataSets.forEach((ds) => {
            if (this.canvasList[ds.label ?? '']) return
            const newWrapper = document.createElement('div')
            newWrapper.setAttribute('class', 'chart-wrapper')
            const newTitle = document.createElement('h3')
            newTitle.style.fontSize = '20px'
            const newCanvas = document.createElement('div')
            newCanvas.setAttribute('name', ds.label ?? '')
            newCanvas.setAttribute('class', 'chart')
            newCanvas.setAttribute(
                'style',
                `min-width: 600px; min-height: 250px; width: 600px; height: 250px;`
            )

            newWrapper!.appendChild(newTitle)
            newWrapper!.appendChild(newCanvas)
            this.gaugeContainer!.appendChild(newWrapper)

            const newChart = echarts.init(newCanvas, this.themeName)
            this.canvasList[ds.label ?? ''] = { echart: newChart, title: newTitle, wrapper: newWrapper }
            // this.canvasList[ds.label ?? ''].setOption(structuredClone(this.template))
            //@ts-ignore
            this.themeBgColor = newChart?._theme?.backgroundColor
            //@ts-ignore
            this.themeColor = newChart?._theme?.gauge?.title?.color
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
            color: var(--re-text-color, #000);
            gap: 12px;
        }

        .chart-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .gauge-container {
            display: flex;
            flex: 1;
            justify-content: center;
            align-items: center;
            flex-wrap: wrap;
            overflow: hidden;
            position: relative;
            gap: 24px;
        }

        header {
            display: flex;
            flex-direction: column;
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
            height: 230px;
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
            <div class="wrapper" style="background-color: ${this.themeBgColor}; color: ${this.themeColor}">
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
