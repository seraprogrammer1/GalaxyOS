import{t as e}from"./chunk-BvrOYcoh.js";import{$ as t,A as n,B as r,E as i,F as a,Q as o,R as s,S as c,_ as l,h as u,it as d,n as f,nt as p,t as m,w as h}from"./client-BU1fzx-G.js";import{n as g,t as _}from"./StoryViewport-DEDGytA9.js";var v=e((()=>{}));function y(e,i){t(i,!0);let d=f(i,`threads`,19,()=>[{id:`1`,name:`System Prompt Assistant`,lastMessage:`Your prompt has been optimized.`,time:`2m ago`,unread:2},{id:`2`,name:`Zillow Scraper Bot`,lastMessage:`Found 14 new listings in Austin.`,time:`15m ago`,unread:0},{id:`3`,name:`Code Review Agent`,lastMessage:`PR #42 looks good to merge.`,time:`1h ago`,unread:1}]);var m=w(),g=r(s(m),2),_=e=>{h(e,b())},v=e=>{var t=C();u(t,21,d,e=>e.id,(e,t)=>{var i=S(),o=s(i),u=s(o,!0);p(o);var d=r(o,2),f=s(d),m=s(f),g=s(m,!0);p(m);var _=r(m,2),v=s(_,!0);p(_),p(f);var y=r(f,2),b=s(y,!0);p(y),p(d);var C=r(d,2),w=e=>{var r=x(),i=s(r,!0);p(r),a(()=>c(i,n(t).unread)),h(e,r)};l(C,e=>{n(t).unread>0&&e(w)}),p(i),a(e=>{c(u,e),c(g,n(t).name),c(v,n(t).time),c(b,n(t).lastMessage)},[()=>n(t).name.charAt(0)]),h(e,i)}),p(t),h(e,t)};l(g,e=>{d().length===0?e(_):e(v,-1)}),p(m),h(e,m),o()}var b,x,S,C,w,T=e((()=>{d(),m(),v(),b=i(`<p class="state-msg empty svelte-1e38wbi">No chats yet.</p>`),x=i(`<span class="unread-badge svelte-1e38wbi"> </span>`),S=i(`<li class="chat-item svelte-1e38wbi" data-testid="chat-thread"><div class="chat-avatar svelte-1e38wbi"> </div> <div class="chat-content svelte-1e38wbi"><div class="chat-top svelte-1e38wbi"><span class="chat-name svelte-1e38wbi"> </span> <span class="chat-time svelte-1e38wbi"> </span></div> <p class="chat-preview svelte-1e38wbi"> </p></div> <!></li>`),C=i(`<ul class="chat-list svelte-1e38wbi"></ul>`),w=i(`<section class="chats-widget glass svelte-1e38wbi" data-testid="recent-chats-widget"><div class="widget-header svelte-1e38wbi"><h3 class="svelte-1e38wbi">Recent Chats</h3> <a href="/chat" class="view-all svelte-1e38wbi">View All</a></div> <!></section>`),y.__docgen={data:[{name:`threads`,visibility:`public`,keywords:[],kind:`let`,type:{kind:`type`,type:`array`,text:`ChatThread[]`},static:!1,readonly:!1,defaultValue:`[\r
			{\r
				id: '1',\r
				name: 'System Prompt Assistant',\r
				lastMessage: 'Your prompt has been optimized.',\r
				time: '2m ago',\r
				unread: 2\r
			},\r
			{\r
				id: '2',\r
				name: 'Zillow Scraper Bot',\r
				lastMessage: 'Found 14 new listings in Austin.',\r
				time: '15m ago',\r
				unread: 0\r
			},\r
			{\r
				id: '3',\r
				name: 'Code Review Agent',\r
				lastMessage: 'PR #42 looks good to merge.',\r
				time: '1h ago',\r
				unread: 1\r
			}\r
		]`}],name:`RecentChatsWidget.svelte`}})),E,D,O,k,A,j,M;e((()=>{T(),g(),E={title:`Features/RecentChatsWidget`,component:y},D=Array.from({length:18},(e,t)=>({id:`thread-${t+1}`,name:`Assistant Thread ${t+1}`,lastMessage:`Update ${t+1}: system reports healthy services and queue updates.`,time:`${t+1}m ago`,unread:t%3==0?2:0})),O={},k={args:{threads:[]}},A={args:{threads:[{id:`1`,name:`System Prompt Assistant`,lastMessage:`Your prompt has been optimized.`,time:`2m ago`,unread:5},{id:`2`,name:`Zillow Scraper Bot`,lastMessage:`Found 14 new listings in Austin.`,time:`15m ago`,unread:3},{id:`3`,name:`Code Review Agent`,lastMessage:`PR #42 looks good to merge.`,time:`1h ago`,unread:1}]}},j={render:()=>({Component:_,props:{Component:y,componentProps:{threads:D}}})},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{}`,...O.parameters?.docs?.source},description:{story:`Default — three mock chat threads.`,...O.parameters?.docs?.description}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  args: {
    threads: []
  }
}`,...k.parameters?.docs?.source},description:{story:`Empty — no conversations yet.`,...k.parameters?.docs?.description}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  args: {
    threads: [{
      id: '1',
      name: 'System Prompt Assistant',
      lastMessage: 'Your prompt has been optimized.',
      time: '2m ago',
      unread: 5
    }, {
      id: '2',
      name: 'Zillow Scraper Bot',
      lastMessage: 'Found 14 new listings in Austin.',
      time: '15m ago',
      unread: 3
    }, {
      id: '3',
      name: 'Code Review Agent',
      lastMessage: 'PR #42 looks good to merge.',
      time: '1h ago',
      unread: 1
    }]
  }
}`,...A.parameters?.docs?.source},description:{story:`All unread — every thread has unread messages.`,...A.parameters?.docs?.description}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  render: () => ({
    Component: StoryViewport,
    props: {
      Component: RecentChatsWidget,
      componentProps: {
        threads: MANY_THREADS
      }
    }
  })
}`,...j.parameters?.docs?.source},description:{story:`Overflow state — fixed-height viewport proving internal list scrolling and sticky header.`,...j.parameters?.docs?.description}}},M=[`Default`,`Empty`,`AllUnread`,`OverflowScrollable`]}))();export{A as AllUnread,O as Default,k as Empty,j as OverflowScrollable,M as __namedExportsOrder,E as default};