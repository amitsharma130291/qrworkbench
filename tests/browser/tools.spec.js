import { test, expect } from '@playwright/test';
import JSZip from 'jszip';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import jsQR from 'jsqr';
async function decoded(buffer) {
 const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 return jsQR(new Uint8ClampedArray(data),info.width,info.height)?.data;
}
const routes=['/bulk-wifi-qr-code-generator','/bulk-url-qr-code-generator','/qr-code-generator-from-excel','/qr-code-generator-with-text','/text-qr-code-generator'];
test.beforeEach(async ({page}) => {
  await page.route('**/*googletagmanager.com/**', route=>route.abort());
  await page.route('**/*google-analytics.com/**', route=>route.abort());
});
for(const route of routes) test(`metadata, paid links and mobile layout: ${route}`,async({page})=>{
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:375,height:812});
  await page.goto(route);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href',`https://www.qrworkbench.com${route}`);
  expect(await page.locator('meta[name=description]').getAttribute('content')).toBeTruthy();
  await expect(page.locator('main a[href="/pricing"]').first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
test('text preserves line breaks and recovers from excessive content',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/text-qr-code-generator');
 const message='Pump 017\nInspect seal before use';
 await page.locator('#f-text').fill(message);
 await expect(page.locator('#dl-svg')).toBeEnabled();
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#dl-png').click()]);
 expect(await decoded(await fs.readFile(await download.path()))).toBe(message);
 await page.locator('#f-text').fill('X'.repeat(12000));
 await expect(page.locator('#dl-svg')).toBeDisabled();
 await expect(page.locator('#qr-empty')).toContainText('cannot fit');
 await page.locator('#f-text').fill('Pump 017');
 await expect(page.locator('#dl-png')).toBeEnabled();
 expect(errors).toEqual([]);
});
test('caption appears in valid SVG and combined PNG export',async({page})=>{
 await page.goto('/qr-code-generator-with-text');
 await page.locator('#f-content').fill('https://example.com/manual');
 await page.locator('#f-caption').fill('Pump <017> & manual');
 await expect(page.locator('#dl-svg')).toBeEnabled();
 const [svgDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#dl-svg').click()]);
 const svg=await fs.readFile(await svgDownload.path(),'utf8');
 expect(svg).toContain('Pump &lt;017&gt; &amp; manual');
 const parsed=await page.evaluate(svg=>{
  const doc=new DOMParser().parseFromString(svg,'image/svg+xml');
  return {errors:doc.querySelectorAll('parsererror').length,width:Number(doc.documentElement.getAttribute('width')),height:Number(doc.documentElement.getAttribute('height')),texts:doc.querySelectorAll('text').length};
 },svg);
 expect(parsed.errors).toBe(0);expect(parsed.height).toBeGreaterThan(parsed.width);expect(parsed.texts).toBeGreaterThan(0);
 expect(await decoded(Buffer.from(svg))).toBe('https://example.com/manual');
 const [pngDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#dl-png').click()]);
 const png=await fs.readFile(await pngDownload.path());
 expect(png.readUInt32BE(20)).toBeGreaterThan(png.readUInt32BE(16));
 expect(await decoded(png)).toBe('https://example.com/manual');
});
test('website mode flags and excludes invalid URLs from ZIP',async({page})=>{
 await page.goto('/bulk?type=web');
 await expect(page.locator('#cfg-type')).toHaveValue('web');
 await page.locator('#file-input').setInputFiles({name:'urls.csv',mimeType:'text/csv',buffer:Buffer.from('ID,URL\ngood,https://example.com/a\nbad,example.com/b\n')});
 await expect(page.locator('#url-validation')).toContainText('1 row(s)');
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#generate-btn').click()]);
 const zip=await JSZip.loadAsync(await fs.readFile(await download.path()));
 expect(Object.keys(zip.files)).toEqual(['good.svg']);
 expect(await decoded(await zip.file('good.svg').async('nodebuffer'))).toBe('https://example.com/a');
});
test('WiFi mode maps network credentials and escapes special characters',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/bulk?type=wifi');
 await expect(page.locator('#cfg-type')).toHaveValue('wifi');
 await page.locator('#file-input').setInputFiles({name:'wifi.csv',mimeType:'text/csv',buffer:Buffer.from('Location,SSID,Password\nRoom-101,Guest;101,00123\n')});
 await expect(page.locator('#map-wifi-ssid')).toHaveValue('SSID');
 await expect(page.locator('#map-wifi-password')).toHaveValue('Password');
 await expect(page.locator('#generate-btn')).toBeEnabled();
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#generate-btn').click()]);
 const zip=await JSZip.loadAsync(await fs.readFile(await download.path()));
 expect(Object.keys(zip.files)).toHaveLength(1);
 expect(await decoded(await zip.file(Object.keys(zip.files)[0]).async('nodebuffer'))).toBe('WIFI:T:WPA;S:Guest\\;101;P:00123;H:false;;');
 expect(errors).toEqual([]);
});
async function workbook(){
 const zip=new JSZip();
 zip.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
 zip.file('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
 zip.file('xl/workbook.xml','<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Products" sheetId="1" r:id="rId1"/><sheet name="Assets" sheetId="2" r:id="rId2"/></sheets></workbook>');
 zip.file('xl/_rels/workbook.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>');
 for(const [i,id] of [[1,'000123'],[2,'ASSET-002']])zip.file(`xl/worksheets/sheet${i}.xml`,`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>ID</t></is></c><c r="B1" t="inlineStr"><is><t>URL</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>${id}</t></is></c><c r="B2" t="inlineStr"><is><t>https://example.com/${id}</t></is></c></row></sheetData></worksheet>`);
 return zip.generateAsync({type:'nodebuffer'});
}
for(const route of ['/bulk','/labels'])test(`native XLSX import and worksheet switch: ${route}`,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(route);
 await page.locator('#file-input').setInputFiles({name:'test.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:await workbook()});
 await expect(page.locator('#worksheet')).toBeVisible();
 await expect(page.locator('#file-rows')).toContainText('1 rows');
 await expect(page.locator('#map-qrdata')).toHaveValue('URL');
 if(route==='/bulk') await expect(page.locator('#preview-list')).toContainText('000123');
 await page.locator('#worksheet').selectOption('1');
 await expect(page.locator('#file-rows')).toContainText('1 rows');
 if(route==='/bulk'){
  await expect(page.locator('#preview-list')).toContainText('ASSET-002');
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#generate-btn').click()]);
  expect(Object.keys((await JSZip.loadAsync(await fs.readFile(await download.path()))).files)).toEqual(['ASSET-002.svg']);
 }else await expect(page.locator('#generate-btn')).toBeDisabled();
 expect(errors).toEqual([]);
});
test('untrusted column names and captions stay literal',async({page})=>{
 await page.goto('/bulk');
 await page.locator('#file-input').setInputFiles({name:'literal.csv',mimeType:'text/csv',buffer:Buffer.from('ID,URL,Name,<img src=x onerror=alert(1)>\n001,https://example.com,"<img src=x onerror=alert(1)>",value\n')});
 await expect(page.locator('#map-caption')).toHaveValue('Name');
 await expect(page.locator('#preview-list')).toContainText('<img src=x onerror=alert(1)>');
 await expect(page.locator('#preview-list img')).toHaveCount(0);
 await expect(page.locator('#map-fields img')).toHaveCount(0);
});
test('free bulk export remains capped at 20 rows',async({page})=>{
 await page.goto('/bulk?type=web');
 const rows=['ID,URL',...Array.from({length:21},(_,i)=>`item-${i},https://example.com/${i}`)].join('\n');
 await page.locator('#file-input').setInputFiles({name:'21-urls.csv',mimeType:'text/csv',buffer:Buffer.from(rows)});
 await expect(page.locator('#generate-btn')).toContainText('20 of 21');
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#generate-btn').click()]);
 const zip=await JSZip.loadAsync(await fs.readFile(await download.path()));
 expect(Object.keys(zip.files)).toHaveLength(20);
});
test('invalid spreadsheet clears previous export state',async({page})=>{
 await page.goto('/bulk');
 await page.locator('#file-input').setInputFiles({name:'valid.csv',mimeType:'text/csv',buffer:Buffer.from('ID,URL\n1,https://example.com')});
 await expect(page.locator('#generate-btn')).toBeEnabled();
 await page.locator('#file-input').setInputFiles({name:'duplicate.csv',mimeType:'text/csv',buffer:Buffer.from('ID,id\n1,2')});
 await expect(page.locator('#error-banner')).toContainText('unique');
 await expect(page.locator('#generate-btn')).toBeDisabled();
});
