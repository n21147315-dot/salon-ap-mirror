import{R as p}from"./index-BXRw7VIx.js";/**
 * @license lucide-react v1.49.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h={name:"undo-2",size:24,node:[["path",{d:"M9 14 4 9l5-5",key:"102s5s"}],["path",{d:"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11",key:"f3b9sd"}]]};h.node;const y=p(h);function g(r,a,i){const l=a.filter(o=>o.type==="salon").sort((o,f)=>{const n=u(o),t=u(f);return n<t?-1:n>t?1:0}),c=a.filter(o=>o.type!=="salon").sort((o,f)=>(i.get(o.id)??99)-(i.get(f.id)??99)),e=new Set,d=[];for(const o of l){const f=new Set(r.tags??[]),n=c.filter(t=>!e.has(t.id)&&(t.tags??[]).some(s=>f.has(s)));for(const t of n.filter(s=>s.type==="book"))d.push(t.id),e.add(t.id);d.push(o.id),e.add(o.id);for(const t of n.filter(s=>s.type==="play"))d.push(t.id),e.add(t.id);for(const t of n.filter(s=>s.type==="film"))d.push(t.id),e.add(t.id)}for(const o of c)e.has(o.id)||d.push(o.id);return d}function u(r){var a,i;return((i=(a=r.dates)==null?void 0:a[0])==null?void 0:i.date)??"9999-12-31"}export{y as U,g as b};
