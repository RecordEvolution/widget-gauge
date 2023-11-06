import type { Chart } from 'chart.js/auto';

export interface Settings {
    title: string
    subTitle: string
  }

export interface Data {
    value: number
    pivot: string
}
export interface Dataseries {
    label: string
    order: number
    needleColor: string
    averageLatest: number
    sections: number[]
    backgroundColors: string[]
    data: Data[]
    // not input values
    needleValue: number 
    chartInstance: Chart
    range: number
    ranges: number[]
}

export interface InputData {
    settings: Settings
    dataseries: Dataseries[]
}