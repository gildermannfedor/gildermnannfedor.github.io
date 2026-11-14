(() => {
  'use strict';
  const menu = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  const dialog = document.querySelector('.search-dialog');
  const input = document.querySelector('#wiki-search');
  const results = document.querySelector('.results');
  const info = document.querySelector('.search-info');
  const opener = document.querySelector('.search-open');
  const main = document.querySelector('main');
  let corpus, pending, returnFocus;
  const normalize = value => value.toLocaleLowerCase('ru').replaceAll('ё','е');
  function toggleMenu(expanded) {
    menu.setAttribute('aria-expanded', String(expanded));
    sidebar.classList.toggle('open', expanded);
    main.inert = expanded;
  }
  menu.addEventListener('click', () => toggleMenu(menu.getAttribute('aria-expanded') !== 'true'));
  sidebar.addEventListener('click', event => {
    if (event.target.closest('a')) toggleMenu(false);
  });
  async function load() {
    if (corpus) return corpus;
    if (!pending) pending = fetch(document.querySelector('script[data-search]').dataset.search)
      .then(response => { if (!response.ok) throw new Error('Unavailable'); return response.json(); })
      .then(value => corpus=value).catch(() => { pending=null; return null; });
    return pending;
  }
  async function find() {
    const query = normalize(input.value.trim());
    results.replaceChildren();
    if (!query) { info.textContent='Введите название или часть слова.'; return; }
    info.textContent='Поиск…';
    const records=await load();
    if (normalize(input.value.trim())!==query) return;
    if (!records) { info.textContent='Поиск сейчас недоступен. Откройте нужную главу через разделы.'; return; }
    const terms=query.split(/\s+/).filter(Boolean);
    const ranked=records.map(record => {
      const title=normalize(record.title), text=normalize(record.text), group=normalize(record.group);
      return {record, score:terms.every(term=>(title+' '+text+' '+group).includes(term)) ? terms.reduce((sum,term)=>sum+(title.includes(term)?12:0)+(group.includes(term)?3:0)+1,0):0};
    }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score);
    const shown=ranked.slice(0,20);
    info.textContent=ranked.length ? `Найдено: ${ranked.length}${ranked.length>20?' · показаны первые 20':''}. Tab — перейти к результатам.` : 'Ничего не найдено. Попробуйте часть названия.';
    for (const {record} of shown) {
      const link=document.createElement('a'), group=document.createElement('small'), title=document.createElement('span'), excerpt=document.createElement('p');
      link.href=record.url; group.textContent=record.group; title.textContent=record.title;
      const plain=record.text.replace(/\s+/g,' ').trim();
      const at=Math.max(0,normalize(plain).indexOf(terms[0])-50);
      excerpt.textContent=(at?'…':'')+plain.slice(at,at+170)+(plain.length>at+170?'…':'');
      link.append(group,title,excerpt);results.append(link);
    }
  }
  function openSearch() { returnFocus=document.activeElement;dialog.showModal();input.focus();load(); }
  for(const trigger of document.querySelectorAll('.search-open,[data-open-search]'))trigger.addEventListener('click',openSearch);
  document.querySelector('.search-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>returnFocus?.focus());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  input.addEventListener('input',find);
  document.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&normalize(event.key)==='k'){event.preventDefault();if(!dialog.open)openSearch();}
    if(event.key==='Escape'&&!dialog.open&&sidebar.classList.contains('open')){toggleMenu(false);menu.focus();}
  });
  matchMedia('(max-width:820px)').addEventListener('change',()=>toggleMenu(false));
  const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
  for(const play of document.querySelectorAll('.play-flow')) play.addEventListener('click',()=>{
    const nodes=play.closest('.production-map').querySelectorAll('.flow-node');
    if(reduceMotion.matches)return;
    nodes.forEach((node,i)=>node.animate([{boxShadow:'0 0 0 1px #79233d',background:'#441b2b',transform:'translateY(-3px)'},{boxShadow:'0 0 0 0px transparent',background:'#1c191b',transform:'translateY(0)'}],{duration:750,delay:i*220,easing:'ease-out'}));
  });
  let queued=false;
  function readingPosition(){
    const limit=document.documentElement.scrollHeight-innerHeight;
    document.querySelector('.reading-line').style.transform=`scaleX(${limit>0?Math.min(1,Math.max(0,scrollY/limit)):0})`;
    queued=false;
  }
  addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(readingPosition);}},{passive:true});
  readingPosition();
  for(const machine of document.querySelectorAll('.machine')) {
    const blocks=JSON.parse(machine.dataset.blocks), turn=machine.querySelector('.turn');
    const rotate=()=>{
      const n=Number(turn.value), rows=machine.querySelectorAll('tbody tr');
      const rotated=blocks.map(([name,x,y,z],i)=>{
        for(let k=0;k<n;k++) [x,z]=[-z,x];
        rows[i].cells[1].textContent=x;rows[i].cells[3].textContent=z;
        return [name,x,y,z,i+1];
      });
      const holder=machine.querySelector('.layer-map');holder.replaceChildren();
      for(const level of [...new Set(blocks.map(row=>row[2]))].sort((a,b)=>a-b)) {
        const floor=document.createElement('div'), label=document.createElement('strong'), grid=document.createElement('div');
        floor.className='floor';label.textContent=`Слой Y = ${level} · север ↑`;grid.className='floor-grid';
        for(let z=-2;z<=2;z++)for(let x=-2;x<=2;x++){
          const block=rotated.find(row=>row[1]===x&&row[2]===level&&row[3]===z),cell=document.createElement('span');
          if(block){cell.textContent=block[4];cell.title=`${block[4]}. ${block[0]} (${x},${level},${z})`;if(x===0&&level===0&&z===0)cell.className='controller';}
          else {cell.className='air';cell.title='Свободное место';}
          grid.append(cell);
        }
        floor.append(label,grid);holder.append(floor);
      }
    };turn.addEventListener('change',rotate);rotate();
  }
})();
