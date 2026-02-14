declare module 'echarts-for-react' {
  import { CSSProperties, Component } from 'react';

  export interface ReactEChartsProps {
    option: any;
    style?: CSSProperties;
    opts?: any;
    onEvents?: any;
    notMerge?: boolean;
    lazyUpdate?: boolean;
    theme?: any;
    onChartReady?: (instance: any) => void;
  }

  export default class ReactECharts extends Component<ReactEChartsProps> {}
}
