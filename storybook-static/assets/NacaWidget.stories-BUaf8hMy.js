import{t as e}from"./chunk-BvrOYcoh.js";import{$ as t,B as n,E as r,F as i,Q as a,R as o,S as s,it as c,n as l,nt as u,t as d,tt as f,w as p}from"./client-BU1fzx-G.js";var m=e((()=>{}));function h(e,r){t(r,!0);let c=l(r,`naca`,19,()=>({homePrice:`$250,000`,monthlyTI:`$350`,buyDown:`5 points`,totalFunds:`$12,500`}));var d=g(),m=n(o(d),2),h=o(m),_=n(o(h),2),v=o(_,!0);u(_),u(h);var y=n(h,2),b=n(o(y),2),x=o(b,!0);u(b),u(y);var S=n(y,2),C=n(o(S),2),w=o(C,!0);u(C),u(S);var T=n(S,2),E=n(o(T),2),D=o(E,!0);u(E),u(T),u(m),f(2),u(d),i(()=>{s(v,c().homePrice),s(x,c().monthlyTI),s(w,c().buyDown),s(D,c().totalFunds)}),p(e,d),a()}var g,_=e((()=>{c(),d(),m(),g=r(`<section class="naca-widget glass svelte-qt62l5" data-testid="naca-widget"><div class="widget-header svelte-qt62l5"><h3 class="svelte-qt62l5">NACA Summary</h3> <span class="badge svelte-qt62l5">Mortgage</span></div> <div class="metrics-grid svelte-qt62l5"><div class="metric svelte-qt62l5"><span class="metric-label svelte-qt62l5">Home Price</span> <span class="metric-value svelte-qt62l5"> </span></div> <div class="metric svelte-qt62l5"><span class="metric-label svelte-qt62l5">Monthly TI</span> <span class="metric-value svelte-qt62l5"> </span></div> <div class="metric svelte-qt62l5"><span class="metric-label svelte-qt62l5">Buy Down</span> <span class="metric-value svelte-qt62l5"> </span></div> <div class="metric svelte-qt62l5"><span class="metric-label svelte-qt62l5">Total Funds</span> <span class="metric-value svelte-qt62l5"> </span></div></div> <button class="open-calc-btn svelte-qt62l5">Open Calculator</button></section>`),h.__docgen={data:[{name:`naca`,visibility:`public`,keywords:[],kind:`let`,type:{kind:`type`,type:`object`,text:`NacaData`},static:!1,readonly:!1,defaultValue:`{\r
			homePrice: '$250,000',\r
			monthlyTI: '$350',\r
			buyDown: '5 points',\r
			totalFunds: '$12,500'\r
		}`}],name:`NacaWidget.svelte`}})),v,y,b,x,S;e((()=>{_(),v={title:`Features/NacaWidget`,component:h},y={},b={args:{naca:{homePrice:`$450,000`,monthlyTI:`$520`,buyDown:`3 points`,totalFunds:`$18,900`}}},x={args:{naca:{homePrice:`$150,000`,monthlyTI:`$210`,buyDown:`7 points`,totalFunds:`$8,200`}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{}`,...y.parameters?.docs?.source},description:{story:`Default — standard NACA summary with 4 data points.`,...y.parameters?.docs?.description}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    naca: {
      homePrice: '$450,000',
      monthlyTI: '$520',
      buyDown: '3 points',
      totalFunds: '$18,900'
    }
  }
}`,...b.parameters?.docs?.source},description:{story:`High-value home — larger purchase scenario.`,...b.parameters?.docs?.description}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    naca: {
      homePrice: '$150,000',
      monthlyTI: '$210',
      buyDown: '7 points',
      totalFunds: '$8,200'
    }
  }
}`,...x.parameters?.docs?.source},description:{story:`Starter home — lower-range entry scenario.`,...x.parameters?.docs?.description}}},S=[`Default`,`HighValue`,`StarterHome`]}))();export{y as Default,b as HighValue,x as StarterHome,S as __namedExportsOrder,v as default};