import{t as e}from"./chunk-BvrOYcoh.js";import{n as t,t as n}from"./ConfirmModal-GMyZYhGa.js";var r,i,a,o,s;e((()=>{t(),r={title:`UI/ConfirmModal`,component:n},i={args:{title:`Are you sure?`,message:`This action cannot be undone.`,showCheckbox:!1,onConfirm:()=>alert(`Confirmed`),onCancel:()=>alert(`Cancelled`)}},a={args:{title:`Delete Goal`,message:`Delete "Run a 5K"? This cannot be undone.`,showCheckbox:!0,onConfirm:e=>alert(`Confirmed (dontAskAgain=${e})`),onCancel:()=>alert(`Cancelled`)}},o={args:{title:`Delete Account`,message:`All your data will be permanently removed.`,showCheckbox:!1,onConfirm:()=>{},onCancel:()=>{}}},i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    title: 'Are you sure?',
    message: 'This action cannot be undone.',
    showCheckbox: false,
    onConfirm: () => alert('Confirmed'),
    onCancel: () => alert('Cancelled')
  }
}`,...i.parameters?.docs?.source},description:{story:`Default confirmation dialog — no checkbox.`,...i.parameters?.docs?.description}}},a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    title: 'Delete Goal',
    message: 'Delete "Run a 5K"? This cannot be undone.',
    showCheckbox: true,
    onConfirm: (dontAskAgain: boolean) => alert(\`Confirmed (dontAskAgain=\${dontAskAgain})\`),
    onCancel: () => alert('Cancelled')
  }
}`,...a.parameters?.docs?.source},description:{story:`With "Don't ask me again" checkbox shown.`,...a.parameters?.docs?.description}}},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    title: 'Delete Account',
    message: 'All your data will be permanently removed.',
    showCheckbox: false,
    onConfirm: () => {},
    onCancel: () => {}
  }
}`,...o.parameters?.docs?.source},description:{story:`Destructive variant — styled for a danger action.`,...o.parameters?.docs?.description}}},s=[`Default`,`WithDontAskAgain`,`Destructive`]}))();export{i as Default,o as Destructive,a as WithDontAskAgain,s as __namedExportsOrder,r as default};