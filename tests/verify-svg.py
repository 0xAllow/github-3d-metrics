import json
import subprocess
import xml.etree.ElementTree as ET

output = subprocess.check_output(["node", "--input-type=module", "-e", """
import { themes, views } from './src/model.ts'
import { renderSvg } from './src/render.ts'
import { sample } from './web/sample.ts'
console.log(JSON.stringify(Object.keys(views).flatMap(view =>
  Object.keys(themes).map(theme => ({ view, theme, svg: renderSvg(sample, { view, theme }) }))
)))
"""], text=True)

cases = json.loads(output)
for case in cases:
    try:
        root = ET.fromstring(case["svg"])
        if root.tag != "{http://www.w3.org/2000/svg}svg":
            raise ValueError("Missing SVG root")
    except (ET.ParseError, ValueError) as error:
        raise SystemExit(f'{case["view"]}/{case["theme"]}: {error}') from error
print(f"Validated {len(cases)} SVG combinations as XML.")
