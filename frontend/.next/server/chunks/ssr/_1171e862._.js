module.exports=[8032,a=>{"use strict";var b=a.i(80826);let c={primary:"#004aad",secondary:"#fc740c",accent:"#0ea5e9",dark:"#0a1628"},d=(0,b.createContext)({school:null,colors:c,loading:!0});function e(){return(0,b.useContext)(d)}a.s(["DEFAULT_COLORS",0,c,"SchoolContext",0,d,"useSchool",()=>e])},78608,a=>{"use strict";var b=a.i(87924),c=a.i(80826),d=a.i(8032);function e({children:a,slug:e}){let[f,g]=(0,c.useState)(null),[h,i]=(0,c.useState)(!0);(0,c.useEffect)(()=>{e?fetch(`https://api.acae.com.co/api/schools/public/${e}`).then(a=>a.json()).then(a=>g(a?.data??a)).catch(()=>null).finally(()=>i(!1)):i(!1)},[e]);let j=f?.pageContent,k={primary:j?.colors?.primary??f?.colors?.primary??d.DEFAULT_COLORS.primary,secondary:j?.colors?.secondary??f?.colors?.secondary??d.DEFAULT_COLORS.secondary,accent:j?.colors?.accent??f?.colors?.accent??d.DEFAULT_COLORS.accent,dark:j?.colors?.dark??f?.colors?.dark??d.DEFAULT_COLORS.dark};return(0,b.jsxs)(d.SchoolContext.Provider,{value:{school:f,colors:k,loading:h},children:[(0,b.jsx)("style",{children:`
        :root {
          --color-primary:   ${k.primary};
          --color-secondary: ${k.secondary};
          --color-accent:    ${k.accent};
          --color-dark:      ${k.dark};
        }
      `}),a]})}a.s(["default",()=>e])}];

//# sourceMappingURL=_1171e862._.js.map