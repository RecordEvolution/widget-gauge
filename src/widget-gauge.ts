import { html, css, LitElement, PropertyValueMap, PropertyValues } from 'lit'
import { customElement, property, query, state } from 'lit/decorators.js'
import { GaugeChartConfiguration, SectionBackgroundColors } from './definition-schema.js'

import * as echarts from 'echarts/core'
import { TooltipComponent } from 'echarts/components'
import { GaugeChart, GaugeSeriesOption } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { EChartsOption, SeriesOption } from 'echarts'

echarts.use([TooltipComponent, GaugeChart, CanvasRenderer])

type Dataseries = Exclude<GaugeChartConfiguration['dataseries'], undefined>[number]
type Data = Exclude<Dataseries['data'], undefined>[number]
type Theme = {
    theme_name: string
    theme_object: any
}
@customElement('widget-gauge-versionplaceholder')
export class WidgetGauge extends LitElement {
    @property({ type: Object })
    inputData?: GaugeChartConfiguration

    @property({ type: Object })
    theme?: Theme

    @state()
    private dataSets: Dataseries[] = []

    @state()
    private canvasList: Map<
        string,
        { echart?: echarts.ECharts; title?: HTMLHeadingElement; wrapper?: HTMLDivElement }
    > = new Map()

    @state() private themeBgColor?: string
    @state() private themeTitleColor?: string
    @state() private themeSubtitleColor?: string

    @query('.gauge-container') private gaugeContainer?: HTMLDivElement
    @query('.wrapper') private wrapper?: HTMLDivElement

    private resizeObserver: ResizeObserver

    boxes?: HTMLDivElement[]
    origWidth: number = 600
    origHeight: number = 350
    textContainerHeight: number = 36
    template: EChartsOption
    modifier: number = 1
    version: string = 'versionplaceholder'

    constructor() {
        super()
        this.resizeObserver = new ResizeObserver(() => {
            this.adjustSizes()
            this.applyData()
        })

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
                        offsetCenter: [0, '-7%']
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
            this.setupCharts()
        }

        if (changedProperties.has('theme')) {
            this.registerTheme(this.theme)
            this.deleteCharts()
            this.transformData()
            this.setupCharts()
            this.adjustSizes()
            this.applyData()
        }
        super.update(changedProperties)
    }

    protected updated(changedProperties: PropertyValues): void {
        if (changedProperties.has('inputData') && this.gaugeContainer) {
            this.adjustSizes()
            this.applyData()
        }
    }

    protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        if (this.wrapper) this.resizeObserver.observe(this.wrapper)
        this.registerTheme(this.theme)
        this.transformData()
        this.setupCharts()
        this.adjustSizes()
        this.applyData()
    }

    registerTheme(theme?: Theme) {
        const cssTextColor = getComputedStyle(this).getPropertyValue('--re-text-color').trim()
        const cssBgColor = getComputedStyle(this).getPropertyValue('--re-tile-background-color').trim()
        this.themeBgColor = cssBgColor || this.theme?.theme_object?.backgroundColor
        this.themeTitleColor = cssTextColor || this.theme?.theme_object?.title?.textStyle?.color
        this.themeSubtitleColor =
            cssTextColor || this.theme?.theme_object?.title?.subtextStyle?.color || this.themeTitleColor

        if (!theme || !theme.theme_object || !theme.theme_name) return
        echarts.registerTheme(theme.theme_name, theme.theme_object)
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
        if (!fit) return
        const modifier = fit.m ?? 0

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
        this.boxes = Array.from(this.gaugeContainer?.querySelectorAll('.chart') as NodeListOf<HTMLDivElement>)

        this.gaugeContainer.style.gridTemplateColumns = `repeat(${fit.c}, 1fr)`

        this.boxes?.forEach((box) =>
            box.setAttribute(
                'style',
                `width:${modifier * chartW}px; height:${modifier * (chartH - this.textContainerHeight)}px`
            )
        )

        this.modifier = modifier

        this.canvasList.forEach((canvasObj) => {
            canvasObj.echart?.resize()
        })
    }

    async transformData() {
        // console.log('Transforming data', this.inputData?.dataseries)
        this.dataSets = []
        if (!this?.inputData) return
        this.inputData.dataseries
            ?.sort((a, b) => ((a.label ?? '') > (b.label ?? '') ? 1 : -1))
            .forEach((ds, idx) => {
                // pivot data
                const distincts = ds.multiChart
                    ? ([...new Set(ds.data?.map((d: Data) => d.pivot))].sort() as string[])
                    : ['']
                distincts.forEach((piv) => {
                    const prefix = piv ?? ''
                    let label = ds.label?.trim() ?? ''
                    label = prefix + (!!prefix && !!label ? ' - ' : '') + label
                    if (this.dataSets.some((ds) => ds.label === label)) label += ' ' + idx
                    const pds: any = {
                        label: label,
                        unit: ds.unit,
                        precision: ds.precision,
                        advanced: ds.advanced,
                        valueColor: ds.valueColor,
                        sections: ds.sections,
                        multiChart: ds.multiChart,
                        value: ds.value,
                        data: distincts.length === 1 ? ds.data : ds?.data?.filter((d) => d.pivot === piv)
                    }
                    this.dataSets.push(pds)
                })
            })
    }

    applyData() {
        if (!this.gaugeContainer) return
        const modifier = this.modifier
        this.dataSets.forEach((d) => {
            d.label ??= ''
        })

        this.dataSets.sort((a, b) => ((a.label as string) > (b.label as string) ? 1 : -1))

        for (const ds of this.dataSets) {
            // compute derivative values
            // filter latest values and calculate average
            ds.label ??= ''
            ds.advanced ??= {}
            if (typeof ds.advanced?.averageLatest !== 'number' || isNaN(ds.advanced?.averageLatest))
                ds.advanced.averageLatest = 1
            const data = ds?.data?.slice(-ds.advanced?.averageLatest || -1) ?? []
            if (!ds.multiChart) {
                ds.needleValue = ds.value as number
            } else {
                const values = (data?.map((d) => d.value)?.filter((p) => p !== undefined) ?? []) as number[]
                ds.needleValue = (values.reduce((p, c) => p + c, 0) / values.length) as number
            }
            ds.needleValue = isNaN(ds.needleValue as number)
                ? ds.sections?.sectionLimits?.[0]
                : ds.needleValue

            // The full range of the gauge
            ds.range =
                (ds.sections?.sectionLimits?.[ds.sections?.sectionLimits?.length - 1] ?? 100) -
                (ds.sections?.sectionLimits?.[0] ?? 0)
            if (isNaN(ds.range as number)) ds.range = 100
            // ds.ranges = ds.sections?.sectionLimits?.map((v, i, a) => v - (a?.[i - 1] ?? 0)).slice(1) ?? []

            const echart = this.canvasList.get(ds.label)?.echart
            const option = echart?.getOption() ?? window.structuredClone(this.template)
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
            // unit style

            ga.title.fontSize = 32 * modifier
            ga.title.color = ds.valueColor || this.themeTitleColor
            ga.title.opacity = 1
            // value style
            ga.detail.color = ds.valueColor || this.themeTitleColor
            ga.detail.opacity = 1
            ga.detail.fontSize = 60 * modifier

            ga.detail.formatter = (val: number) =>
                isNaN(val) ? '-' : val.toFixed(Math.floor(ds.precision ?? 0))
            // ga.anchor.itemStyle.color = ds.valueColor
            // ga.pointer.itemStyle.color = ds.valueColor

            // Axis
            const sectionLimits = !ds.sections?.sectionLimits?.length
                ? [0, 40, 80, 100]
                : ds.sections?.sectionLimits
            ga2.min = sectionLimits?.length ? Math.min(...sectionLimits) : 0
            ga2.max = sectionLimits?.length ? Math.max(...sectionLimits) : 100
            ga.min = ga2.min
            ga.max = ga2.max

            const tcolors: SectionBackgroundColors = this.theme?.theme_object?.color
            const bcolors: SectionBackgroundColors = !ds.sections?.backgroundColors?.length
                ? (tcolors?.slice(0, 3) ?? ['#bf444c', '#d88273', '#f6efa6'])
                : ds.sections?.backgroundColors

            const colors: SectionBackgroundColors = bcolors?.map(
                (b, i) => b || tcolors[i % (tcolors?.length ?? 0)]
            ) ??
                tcolors?.slice(0, 3) ?? ['#bf444c', '#d88273', '#f6efa6']

            // percentages of the sections paired with the colors
            const colorSections = colors
                ?.map((b, i) => [((sectionLimits?.[i + 1] ?? ga.min) - ga.min) / (ds.range as number), b])
                .filter(([s]) => !isNaN(s as number)) ?? [1 / 3, 1 / 3, 1 / 3]

            ga2.axisLine.lineStyle.width = 8 * modifier
            ga2.axisLine.lineStyle.color = colorSections?.length
                ? colorSections
                : ga2.axisLine.lineStyle.color
            ga2.axisLabel.fontSize = 24 * modifier
            // ga2.axisLabel.color = ds.valueColor
            ga2.axisLabel.distance = -24 * modifier
            ga2.splitLine.length = 16 * modifier
            ga2.splitLine.distance = -16 * modifier

            // Progress
            let progressColor = colors?.[colors.length - 1]
            for (const [i, s] of sectionLimits?.entries() ?? []) {
                if (s > (ds.needleValue as number)) {
                    progressColor = colors?.[i - 1] ?? colors?.[0]
                    break
                }
            }
            ga.progress.itemStyle.color = progressColor
            ga.progress.width = 60 * modifier

            const titleElement = this.canvasList.get(ds.label)?.title
            if (titleElement) {
                titleElement.style.fontSize = String(36 * modifier) + 'px'
                titleElement.style.maxWidth = String(300 * modifier) + 'px'
                titleElement.style.height = String(this.textContainerHeight * modifier) + 'px'
                titleElement.textContent = ds.label ?? ''
            }

            // Apply
            echart?.setOption(option)
        }
    }
    deleteCharts() {
        this.canvasList.forEach((canvasObj, label) => {
            canvasObj.echart?.dispose()
            canvasObj.wrapper?.remove()
        })
        this.canvasList.clear()
    }

    setupCharts() {
        if (!this.gaugeContainer) return
        // remove the gauge canvases of non provided data series
        this.canvasList.forEach((canvasObj, label) => {
            const ex = this.dataSets.find((ds) => ds.label === label)
            if (!ex) {
                canvasObj.echart?.dispose()
                canvasObj.wrapper?.remove()
                this.canvasList.delete(label)
            }
        })

        this.dataSets.forEach((ds) => {
            if (this.canvasList.has(ds.label ?? '')) return
            const newWrapper = document.createElement('div')
            newWrapper.setAttribute('class', 'chart-wrapper')
            const newTitle = document.createElement('h3')
            newTitle.style.fontSize = '20px'
            const newCanvas = document.createElement('div')
            newCanvas.setAttribute('name', ds.label ?? '')
            newCanvas.setAttribute('class', 'chart')
            newCanvas.setAttribute(
                'style',
                `min-width: ${this.origWidth}; min-height: ${this.origHeight}; width: ${this.origWidth}; height: ${this.origHeight};`
            )

            newWrapper!.appendChild(newTitle)
            newWrapper!.appendChild(newCanvas)
            this.gaugeContainer!.appendChild(newWrapper)

            const newChart = echarts.init(newCanvas, this.theme?.theme_name)
            this.canvasList.set(ds.label ?? '', { echart: newChart, title: newTitle, wrapper: newWrapper })
        })
    }

    static styles = css`
        :host {
            display: block;
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
            gap: 12px;
        }

        .chart-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .gauge-container {
            display: grid;
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
            line-height: 0.8;
        }

        .title {
            line-height: 1.5;
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

        .no-data {
            font-size: 20px;
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
            <div
                class="wrapper"
                style="background-color: ${this.themeBgColor}; color: ${this.themeTitleColor}"
            >
                <header class="paging" ?active=${this.inputData?.title || this.inputData?.subTitle}>
                    <h3 class="paging title" ?active=${this.inputData?.title}>${this.inputData?.title}</h3>
                    <p
                        class="paging"
                        ?active=${this.inputData?.subTitle}
                        style="color: ${this.themeSubtitleColor}"
                    >
                        ${this.inputData?.subTitle}
                    </p>
                </header>
                <div class="paging no-data" ?active=${!this.dataSets.length}>No Data</div>
                <div class="gauge-container"></div>
            </div>
        `
    }
}
