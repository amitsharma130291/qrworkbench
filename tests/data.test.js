import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV } from '../src/lib/csv.js';
import { tableToRows, isWebURL } from '../src/lib/spreadsheet.js';
import { buildWifiPayload } from '../src/lib/formats.js';
import { captionLines, captionLayout, captionedSVG } from '../src/lib/caption.js';
test('CSV preserves quoted multiline text, commas, quotes and leading zeroes',()=>{
 const result=parseCSV('\uFEFFID,Text\r\n00123,"Line 1\nLine 2, with ""quotes"""\r\n');
 assert.deepEqual(result.rows,[{ID:'00123',Text:'Line 1\nLine 2, with "quotes"'}]);
});
test('CSV rejects ambiguous headers and broken quotes',()=>{
 assert.throws(()=>parseCSV('ID,id\na,b'));assert.throws(()=>parseCSV('ID,\na,b'));assert.throws(()=>parseCSV('ID,Text\na,"broken'));
});
test('XLSX cells retain text IDs, blank rows are omitted, duplicate headers rejected',()=>{
 assert.deepEqual(tableToRows([['ID','URL'],['000123','https://example.com'],[null,null]]).rows,[{ID:'000123',URL:'https://example.com'}]);
 assert.throws(()=>tableToRows([['ID','id'],['a','b']]));
});
test('URL validation accepts only complete web URLs',()=>{
 for(const v of ['https://example.com/a?q=1','http://example.com'])assert.equal(isWebURL(v),true);
 for(const v of ['example.com','mailto:a@example.com','javascript:alert(1)',''])assert.equal(isWebURL(v),false);
});
test('WiFi payload escapes delimiters and omits open-network passwords',()=>{
 assert.equal(buildWifiPayload({ssid:'Guest;101',password:'00123'}),'WIFI:T:WPA;S:Guest\\;101;P:00123;H:false;;');
 assert.equal(buildWifiPayload({ssid:'Guest',password:'secret',security:'nopass'}),'WIFI:T:nopass;S:Guest;H:false;;');
});
test('caption layout wraps long words and escapes XML',async()=>{
 assert.ok(captionLines('a'.repeat(100)).every(line=>line.length<=32));
 assert.ok(captionLayout('A caption',800).extra>0);
 const svg=await captionedSVG('https://example.com',{width:800,dark:'#111111',light:'#ffffff'},'<img> & "quoted"',.035);
 assert.ok(svg.includes('&lt;img&gt; &amp; &quot;quoted&quot;'));
});
