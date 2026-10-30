import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

test('compiled Vercel ESM handlers resolve server imports and start successfully', async () => {
  const root=await mkdtemp(join(tmpdir(),'loft-vercel-runtime-'))
  const repo=fileURLToPath(new URL('../',import.meta.url))
  try {
    const config=JSON.parse(await readFile(join(repo,'tsconfig.json'),'utf8'))
    assert.equal(config.compilerOptions.rewriteRelativeImportExtensions,true)
    await writeFile(join(root,'package.json'),'{"type":"module"}')
    await symlink(join(repo,'node_modules'),join(root,'node_modules'),'dir')
    for(const dir of ['api','server']) {
      await mkdir(join(root,dir))
      for(const name of await readdir(join(repo,dir))) {
        if(!name.endsWith('.ts')) continue
        const source=await readFile(join(repo,dir,name),'utf8')
        const result=ts.transpileModule(source,{fileName:name,compilerOptions:{
          module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023,
          rewriteRelativeImportExtensions:config.compilerOptions.rewriteRelativeImportExtensions,
        }})
        await writeFile(join(root,dir,name.replace(/\.ts$/,'.js')),result.outputText)
      }
    }
    process.env.TELEGRAM_BOT_TOKEN='12345:runtime-test'
    const {default:handler}=await import(pathToFileURL(join(root,'api/store.js')).href)
    const res={code:200,setHeader(){},status(n:number){this.code=n;return this},json(){return this}}
    await handler({method:'POST',headers:{'content-type':'application/json'},body:{action:'orders'}},res)
    assert.equal(res.code,401)
  } finally { await rm(root,{recursive:true,force:true}) }
})
