import type { Config } from 'tailwindcss';
export default { content: ['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}'], theme: { extend: { colors: { acid:'#d8ff3e', ink:'#0b0d0c', mist:'#e9e9e4', chrome:'#b6b9b7' }, fontFamily: { display:['Arial Black','Arial','sans-serif'] } } }, plugins: [] } satisfies Config;
