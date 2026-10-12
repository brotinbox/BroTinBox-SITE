import sys, zipfile, re, csv, os
import xml.etree.ElementTree as ET
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
src, out = sys.argv[1], sys.argv[2]
z=zipfile.ZipFile(src)
ss=[]
if 'xl/sharedStrings.xml' in z.namelist():
    for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',NS):
        ss.append(''.join(t.text or '' for t in si.iter('{%s}t'%NS['m'])))
wb=ET.fromstring(z.read('xl/workbook.xml'))
rels=ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
rmap={r.get('Id'):r.get('Target') for r in rels}
def col(ref):
    n=0
    for ch in re.match(r'[A-Z]+',ref).group():
        n=n*26+ord(ch)-64
    return n-1
os.makedirs(out,exist_ok=True)
for sh in wb.find('m:sheets',NS):
    name=sh.get('name'); target=rmap[sh.get('{%s}id'%NS['r'])]
    path='xl/'+target.lstrip('/').replace('xl/','') if not target.startswith('/xl') else target.lstrip('/')
    root=ET.fromstring(z.read(path))
    rows=[]
    for r in root.iter('{%s}row'%NS['m']):
        vals={}
        for c in r.findall('m:c',NS):
            t=c.get('t'); v=c.find('m:v',NS); txt=None
            if t=='s' and v is not None: txt=ss[int(v.text)]
            elif t=='inlineStr':
                txt=''.join(x.text or '' for x in c.iter('{%s}t'%NS['m']))
            elif v is not None: txt=v.text
            vals[col(c.get('r'))]=txt if txt is not None else ''
        if vals:
            rows.append([vals.get(i,'') for i in range(max(vals)+1)])
    fn=os.path.join(out,re.sub(r'[^A-Za-z0-9]+','_',name)+'.csv')
    with open(fn,'w',newline='') as f: csv.writer(f).writerows(rows)
    print(f"{name}: {len(rows)} rows -> {fn}")
