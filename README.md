# \<widget-gauge>

## Installation

```bash
npm i widget-gauge
```

## Usage

```html
<script type="module">
  import 'widget-gauge';
</script>

<widget-gauge></widget-gauge>
```

## Expected data format

The following format represents the available data :
```json
{
  "settings": {

  },
  "dataseries": [{
    "label": "Demo Gauge 1",
    "unit": "°C",
    "valueColor": "black",
    "sections": [-20, 80, 90, 120],
    "backgroundColors": [
      "#AAC8A7",
      "#F1C27B",
      "#FF9B9B"
    ],
    "averageLatest": 1,
    "data": [{
      "value": 90,
      "pivot": "Frankfurt"
    },{
      "value": 40,
      "pivot": "Berlin"
    },{
      "value": 70,
      "pivot": "Berlin"
    },{
      "value": 200,
      "pivot": "Frankfurt"
    },{
      "value": 20,
      "pivot": "München"
    }]
  },{
    "label": "Demo Gauge 2",
    "unit": "Pa",
    "valueColor": "green",
    "averageLatest": 1,
    "data": [{
      "value": 79
    }]
  }]
}
```


## Development

To use the widget locally during development clone the widget repo and start the dev server:

```bash
npm run start
```

This runs a local development server that serves the basic demo located in `demo/index.html`

If you want to use the widget inside another project X, then add the widget as npm module to the project X as usual. i.e. in the folder of X

```bash
npm i widget-gauge
```

To avoid releasing the widget-gauge on every change and updating the node_modules in X you can "link" the package locally.

Go to your local widget-gauge git repo and do

```bash
npm link
```

This create a global symbolic link on your environment. Now go to your project X git folder and do

```bash
npm link widget-gauge
```

This replaces the already imported widget-gauge package with your local widget-gauge git repo. Since this node module is linked all changes you make in your local widget-gauge repo will immediately be visible in project X.



