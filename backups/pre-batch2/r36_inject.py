s=open('/tmp/Index.pre36.html').read()
js=''.join(open('build/'+f).read()+'\n' for f in ['r36eyes.js','r36sp.js','r36yt.js','r37ad.js','r38dock.js','r39mood.js','r40gp.js','r38ex.js','r41int.js','r43nav.js','r42ost.js','r45bar.js','r46ad.js','r47nav.js','r48grid.js','r49log.js','r50ost.js','r51mood.js','r52stats.js','r53pick.js','r54sort.js','r55fix.js'])
css=open('build/r36yt.css').read()+open('build/r37ad.css').read()+open('build/r38dock.css').read()+open('build/r40gp.css').read()+open('build/r38ex.css').read()+open('build/r41int.css').read()+open('build/r43nav.css').read()+open('build/r42ost.css').read()+open('build/r45bar.css').read()+open('build/r46ad.css').read()+open('build/r47nav.css').read()+open('build/r48grid.css').read()+open('build/r49log.css').read()+open('build/r50ost.css').read()+open('build/r51mood.css').read()+open('build/r52stats.css').read()+open('build/r53pick.css').read()+open('build/r54sort.css').read()+open('build/r55fix.css').read()
i=s.rindex('</script>');s=s[:i]+'\n'+js+s[i:]
i=s.rindex('</style>');s=s[:i]+css+s[i:]
open('Index.html','w').write(s)
