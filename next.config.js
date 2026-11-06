// Keep Vercel System Environment Variables enabled: server IP trust and
// production/preview data isolation depend on VERCEL and VERCEL_ENV.
/** @type {import('next').NextConfig} */
const nextConfig={reactStrictMode:true,async headers(){
 const headers=[
  {key:'X-Frame-Options',value:'DENY'},{key:'X-Content-Type-Options',value:'nosniff'},
  {key:'Referrer-Policy',value:'no-referrer'},
  {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
  {key:'Content-Security-Policy',value:["default-src 'self'",`script-src 'self' 'unsafe-inline'${process.env.NODE_ENV==='development'?" 'unsafe-eval'":''}`,"style-src 'self' 'unsafe-inline'","img-src 'self' data: blob: https:","font-src 'self'","connect-src 'self'","frame-ancestors 'none'","object-src 'none'","base-uri 'self'","form-action 'self'"].join('; ')}
 ];
 const rules=[{source:'/:path*',headers}];
 // Only synthetic preview fixtures may be embedded by the same-origin viewport tester.
 if(process.env.VERCEL_ENV==='preview'){
   rules.push({source:'/review/report',has:[{type:'query',key:'frame',value:'1'}],
     headers:headers.map(header=>{
       if(header.key==='X-Frame-Options')return {...header,value:'SAMEORIGIN'};
       if(header.key==='Content-Security-Policy')return {...header,value:header.value.replace("frame-ancestors 'none'","frame-ancestors 'self'")};
       return header;
     })});
 }
 return rules;
}};
module.exports=nextConfig;
