export interface Settings {
    title: string;
    data: number;
    subTitle: string;
    minGauge: number;
    maxGauge: number;
  }

export interface Style {
    needleColor: string;
    sections: number;
    backgroundColor: string[];
    labels: string[];
}

export interface InputData {
    settings: Settings
    style: Style
}