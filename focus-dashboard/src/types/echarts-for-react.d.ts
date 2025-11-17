declare module 'echarts-for-react' {
  import { CSSProperties } from 'react';
  import { EChartsOption } from 'echarts';

  export interface ReactEChartsProps {
    option: EChartsOption;
    style?: CSSProperties;
    opts?: any;
    onEvents?: any;
    notMerge?: boolean;
    lazyUpdate?: boolean;
    theme?: any;
    onChartReady?: (instance: any) => void;
  }

  export default class ReactECharts extends React.Component<ReactEChartsProps> {}
}
