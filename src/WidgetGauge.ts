import { html, css, LitElement } from 'lit';
import { property, state } from 'lit/decorators.js';
import { Chart } from 'chart.js/auto';

declare global {
  interface Settings {
    title: string;
    data: number;
    subTitle: string;
    minGauge: number;
    maxGauge: number;
  }

  interface Style {
    needleColor: string;
    sections: number;
    backgroundColor: string[];
    labels: string[];
  }

  interface InputData {
    settings: Settings
    style: Style
  }
}

export class WidgetGauge extends LitElement {
  
  @property() inputData = {} as InputData

  @state()
  private demoCanvas: HTMLCanvasElement | undefined = undefined;
  @state()
  private chartInstance: Chart | undefined = undefined;
  @state()
  private dataTotal: number = 100;
  @state()
  private needleValue: number = 50;
  @state()
  private min: number = 0;
  @state()
  private max: number = 100;
  @state()
  private needleColor: string = 'grey';
  @state()
  private sections: number = 3;
  @state()
  private gaugeTitle: string = 'Gauge-chart';
  @state()
  private gaugeDescription: string = 'This is a Gauge-chart from the RE-Dahsboard';
  @state()
  private backgroundColor: string[] = [
      '#AAC8A7',
      '#F1C27B',
      '#FF9B9B'
    ]
  @state()
  private labels: string[] = [
      'Green',
      'Orange',
      'Red'
    ]

  updated(changedProperties: Map<string, any>) {
    changedProperties.forEach((oldValue, propName) => {
      if (propName === 'inputData') {
            if(oldValue?.gaugeValue) {
              this.createGaugeData()
              this.chartInstance?.update()
              return
            }
            this.createGaugeData()
            this.renderChart()
          return
      }
    })
  }

  createGaugeData() {
    if(!this.inputData?.settings || !this.inputData?.settings?.data) return
    this.needleValue = this.inputData.settings.data ? this.inputData.settings.data : this.needleValue
    this.min = this.inputData.settings.minGauge ? this.inputData.settings.minGauge : this.min
    this.max = this.inputData.settings.maxGauge ? this.inputData.settings.maxGauge : this.max
    this.gaugeTitle = this.inputData.settings.title
    this.gaugeDescription = this.inputData.settings.subTitle
    this.dataTotal = this.max - this.min

    this.needleColor = this.inputData.style.needleColor ? this.inputData.style.needleColor : this.needleColor
    this.sections = this.inputData.style.sections ? this.inputData.style.sections : this.sections
    this.backgroundColor = this.inputData.style.backgroundColor ? this.inputData.style.backgroundColor : this.backgroundColor
    this.labels = this.inputData.style.labels ? this.inputData.style.labels : this.labels

  }

  getArea() {
    if(this.max == null || this.min == null) return [100]
    const section = (this.max - this.min) / this.sections
    let sectioneArray = []
    for (let i = 0; i < this.sections; i++) {
      sectioneArray.push(section)
    }
    return sectioneArray
  }

  renderChart() {
    if(!this.demoCanvas) {
      this.demoCanvas = this.shadowRoot?.querySelector('#gauge') as HTMLCanvasElement;
    }
		if(!this.demoCanvas) { return }
    
    if (!this.chartInstance) {
      this.chartInstance = new Chart(
        this.demoCanvas,
        {
          type: 'doughnut',
          data: {
            labels: this.labels,
            datasets: [{
              data: this.getArea() as number[],
              //@ts-ignore
              // needleValue: 50,
              backgroundColor: this.backgroundColor
            }]
          },
  
          options: {
            responsive: false,
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
              animateRotate: false,
              animateScale: true
            }
          },
  
          plugins: [{
            id: 'doughnut',
            afterDraw: (chart: Chart) => {
              //@ts-ignore
              // this.needleValue = chart.config.data.datasets[0].needleValue;
  
              var angle = Math.PI + (1 / this.dataTotal * this.needleValue * Math.PI);
              var ctx = chart.ctx;
              var cw = chart.canvas.offsetWidth;
              var ch = chart.canvas.offsetHeight;
              // var cw = this.offsetWidth;
              // var ch = this.offsetHeight;
              var cx = cw / 2;
              var cy = ch - 6;
        
              ctx.translate(cx, cy);
              ctx.rotate(angle);
              ctx.beginPath();
              ctx.moveTo(0, -3);
              ctx.lineTo(ch - 20, 0);
              ctx.lineTo(0, 3);
              ctx.fillStyle = this.needleColor;
              ctx.fill();
              ctx.rotate(-angle);
              ctx.translate(-cx, -cy);
              ctx.beginPath();
              ctx.arc(cx, cy, 5, 0, Math.PI * 2);
              ctx.fill();
            }
          }]
          
        }
      ) as Chart;
    } else {
      this.chartInstance.update()
    }

  }

  /**
   * --widget-gauge-text-color
   * --widget-gauge-background-color
   * 
   * */ 

  static styles = css`
    :host {
      display: inline-block;
      color: var(--widget-gauge-text-color, #000);
      font-family: sans-serif;
      padding: 16px;
      box-sizing: border-box;
      position: relative;
      margin: auto;
    }
    #gauge {
      margin: 0 auto;
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
  `;

  render() {
    return html`
      <header>
        <h3>${this.gaugeTitle}</h3>
        <p>${this.gaugeDescription}</p>
      </header>
      <canvas id="gauge"></canvas>
      <div id="currentValue">${this.needleValue}</div>
    `;
  }
}
