(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,63830,o=>{"use strict";var c=o.i(71645);let r={primary:"#004aad",secondary:"#fc740c",accent:"#0ea5e9",dark:"#0a1628"},e=(0,c.createContext)({school:null,colors:r,loading:!0});function a(){return(0,c.useContext)(e)}o.s(["DEFAULT_COLORS",0,r,"SchoolContext",0,e,"useSchool",()=>a])},78492,o=>{"use strict";var c=o.i(43476),r=o.i(71645),e=o.i(63830);function a({children:o,slug:a}){let[t,l]=(0,r.useState)(null),[n,s]=(0,r.useState)(!0);(0,r.useEffect)(()=>{a?fetch(`https://api.acae.com.co/api/schools/public/${a}`).then(o=>o.json()).then(o=>l(o?.data??o)).catch(()=>null).finally(()=>s(!1)):s(!1)},[a]);let i=t?.pageContent,d={primary:i?.colors?.primary??t?.colors?.primary??e.DEFAULT_COLORS.primary,secondary:i?.colors?.secondary??t?.colors?.secondary??e.DEFAULT_COLORS.secondary,accent:i?.colors?.accent??t?.colors?.accent??e.DEFAULT_COLORS.accent,dark:i?.colors?.dark??t?.colors?.dark??e.DEFAULT_COLORS.dark};return(0,c.jsxs)(e.SchoolContext.Provider,{value:{school:t,colors:d,loading:n},children:[(0,c.jsx)("style",{children:`
        :root {
          --color-primary:   ${d.primary};
          --color-secondary: ${d.secondary};
          --color-accent:    ${d.accent};
          --color-dark:      ${d.dark};
        }
      `}),o]})}o.s(["default",()=>a])}]);