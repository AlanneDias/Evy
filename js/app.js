/* EVY Aluga — comportamento do site.
   Vitrine com física de pêndulo, acervo com filtros, sacola de consulta e envio pelo WhatsApp. */
(function(){
'use strict';

const WHATSAPP='5583991000141';
const SITE='https://alannedias.github.io/Evy/';
const ACERVO=window.EVY_ACERVO||[];
const VITRINE=window.EVY_VITRINE||[];
const PORID=Object.fromEntries(ACERVO.map(p=>[p.id,p]));
const $=id=>document.getElementById(id);
const movimentoReduzido=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- utilidades ---------- */
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const precoTexto=p=>p.price!=null?'R$ '+p.price+',00':'Valor sob consulta';
const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const hoje=()=>iso(new Date());
const diaSeguinte=s=>{if(!s)return'';const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+1);return iso(d)};
const dataBR=s=>s?s.split('-').reverse().join('/'):'';
const ehRoupa=p=>p.kind!=='Bolsas';
const ler=(chave,padrao)=>{try{const v=JSON.parse(localStorage.getItem(chave));return v??padrao}catch(e){return padrao}};
const gravar=(chave,valor)=>{try{localStorage.setItem(chave,JSON.stringify(valor))}catch(e){}};
const logoSemFoto='<div class="cartao-sem-foto"><img src="assets/evy-logo.svg" alt="" width="84" height="46"><span>Foto em breve</span></div>';
function fotoHTML(p,{lazy=true}={}){
  if(!p.photo)return logoSemFoto;
  return '<img src="'+esc(p.photo)+'" alt="'+esc(p.name)+'" class="'+(p.fit==='cover'?'capa':'')+'"'+(lazy?' loading="lazy"':'')+' decoding="async">';
}
function aviso(msg){
  const t=$('aviso');t.textContent=msg;t.classList.add('visivel');
  clearTimeout(aviso.t);aviso.t=setTimeout(()=>t.classList.remove('visivel'),2600);
}
function pulsar(node){if(!node)return;node.classList.remove('pulsar');void node.offsetWidth;node.classList.add('pulsar')}

/* ---------- estado ---------- */
let sacola=ler('evy-sacola',[]).filter(x=>x&&PORID[x.id]);
let favoritos=new Set(ler('evy-favoritos',[]).filter(id=>PORID[id]));

function atualizarContadores(){
  const n=sacola.length,f=favoritos.size;
  $('numSacola').textContent=n;$('numSacola').hidden=!n;
  $('sacolaCenaNum').textContent=n;$('sacolaCenaNum').hidden=!n;
  $('abrirSacola').setAttribute('aria-label','Sacola: '+n+(n===1?' peça':' peças'));
  $('numFavoritos').textContent=f;$('numFavoritos').hidden=!f;
  $('abrirFavoritos').classList.toggle('tem-favoritos',f>0);
  $('abrirFavoritos').setAttribute('aria-label','Favoritos: '+f+(f===1?' peça':' peças'));
  document.querySelectorAll('.peca').forEach(b=>{
    const dentro=sacola.some(x=>x.id===b.dataset.id)||b.dataset.id===pecaPendente;
    if(b.classList.contains('na-sacola')&&!dentro)balancar(b,(Math.random()>.5?1:-1)*60);
    b.classList.toggle('na-sacola',dentro);
  });
}
function salvarSacola(){gravar('evy-sacola',sacola);atualizarContadores()}
function alternarFavorito(id){
  if(favoritos.has(id))favoritos.delete(id);else favoritos.add(id);
  gravar('evy-favoritos',[...favoritos]);
  document.querySelectorAll('[data-favoritar="'+id+'"]').forEach(b=>b.setAttribute('aria-pressed',String(favoritos.has(id))));
  atualizarContadores();pulsar($('abrirFavoritos'));
  aviso(favoritos.has(id)?'Peça salva nos favoritos':'Peça removida dos favoritos');
}

/* ---------- painel lateral ---------- */
let aoFechar=null,focoAnterior=null;
function abrirPainel(titulo,html,fechou){
  if(!$('painel').hidden)fecharPainel(true);
  focoAnterior=document.activeElement;aoFechar=fechou||null;
  $('painelTitulo').textContent=titulo;$('painelCorpo').innerHTML=html;$('painelCorpo').scrollTop=0;
  $('painel').hidden=false;$('veu').hidden=false;document.body.style.overflow='hidden';
  $('fecharPainel').focus();
}
function fecharPainel(semFoco){
  if($('painel').hidden)return;
  $('painel').hidden=true;$('veu').hidden=true;document.body.style.overflow='';
  const f=aoFechar;aoFechar=null;if(f)f();
  if(!semFoco&&focoAnterior&&document.contains(focoAnterior))focoAnterior.focus({preventScroll:true});
}
$('fecharPainel').addEventListener('click',()=>fecharPainel());
$('veu').addEventListener('click',()=>fecharPainel());
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){fecharPainel();fecharMenu()}
  if(e.key==='Tab'&&!$('painel').hidden){
    const f=[...$('painel').querySelectorAll('button,a[href],input:not([readonly]),select')].filter(x=>!x.disabled&&x.offsetParent);
    if(!f.length)return;const a=f[0],z=f[f.length-1];
    if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}
    else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}
  }
});

/* ---------- peça: detalhes e formulário ---------- */
function linkWhatsPeca(p){
  const msg='Oi, EVY! Tenho interesse nesta peça:\n'+p.name+'\nCódigo: '+p.code+'\nVer no acervo: '+SITE+'#peca-'+encodeURIComponent(p.id);
  return 'https://wa.me/'+WHATSAPP+'?text='+encodeURIComponent(msg);
}
function abrirPeca(p,{fechou}={}){
  let adicionou=false;
  const naSacola=sacola.some(x=>x.id===p.id);
  const tamanhos=p.size.map(s=>'<option>'+esc(s)+'</option>').join('');
  const prova=ehRoupa(p)?
    '<fieldset><legend>1. Prova no showroom</legend>'+
    '<p class="dica">Solicite a prova antes da data da locação. O horário depende da confirmação da EVY.</p>'+
    '<label>Data da prova<input id="fProvaData" type="date" min="'+hoje()+'"></label>'+
    '<label>Período da prova<select id="fProvaPeriodo"><option value="">Selecione</option><option value="manhã">Manhã</option><option value="tarde">Tarde</option><option value="noite">Noite (consultar disponibilidade)</option></select></label></fieldset>':'';
  const formulario=naSacola?
    '<p class="painel-nota">Esta peça já está na sua sacola.</p><button class="botao botao--preto" type="button" id="irSacola" style="width:100%">Ver sacola</button>':
    '<form class="formulario" id="formLocacao" novalidate>'+
    '<label>Tamanho<select id="fTamanho">'+tamanhos+'</select></label>'+prova+
    '<fieldset><legend>'+(ehRoupa(p)?'2. ':'')+'Período da locação</legend>'+
    '<label>Data da retirada<input id="fData" type="date" min="'+hoje()+'"></label>'+
    '<label>Devolução<input id="fDevolucao" type="date" readonly tabindex="-1"></label>'+
    '<label>Retirada ou entrega<select id="fModo"><option value="Retirada">Retirada</option><option value="Entrega">Consultar entrega</option></select></label></fieldset>'+
    '<p class="dica">Locação padrão de 24 horas. Disponibilidade e agendamento sujeitos à confirmação; a reserva só é efetivada após o pagamento.</p>'+
    '<button class="botao botao--rosa" type="submit">Adicionar à sacola</button></form>';
  abrirPainel('Solicitar locação',
    '<div class="painel-foto">'+fotoHTML(p,{lazy:false})+'</div>'+
    '<p class="painel-meta">'+esc(p.code)+' · '+esc(p.kind)+(p.color?' · '+esc(p.color):'')+'</p>'+
    '<h2>'+esc(p.name)+'</h2>'+
    '<p class="painel-meta">Tamanho: '+esc(p.size.join(' / '))+'</p>'+
    '<p class="painel-preco">'+precoTexto(p)+'</p>'+
    '<div class="painel-acoes"><button class="botao botao--linha" type="button" data-favoritar="'+esc(p.id)+'" aria-pressed="'+favoritos.has(p.id)+'">♡ Favoritar</button>'+
    '<a class="botao botao--linha" href="'+linkWhatsPeca(p)+'" target="_blank" rel="noopener noreferrer">Perguntar no WhatsApp</a></div>'+
    formulario,
    ()=>{if(fechou)fechou(adicionou)});
  if(naSacola){$('irSacola').onclick=abrirSacola;return}
  $('fData').addEventListener('change',e=>{$('fDevolucao').value=diaSeguinte(e.target.value)});
  $('formLocacao').addEventListener('submit',e=>{
    e.preventDefault();
    const data=$('fData').value;
    const provaData=ehRoupa(p)?$('fProvaData').value:null,provaPeriodo=ehRoupa(p)?$('fProvaPeriodo').value:null;
    if(ehRoupa(p)&&(!provaData||!provaPeriodo)){aviso('Informe a data e o período da prova');($('fProvaData').value?$('fProvaPeriodo'):$('fProvaData')).focus();return}
    if(!data){aviso('Informe a data da retirada');$('fData').focus();return}
    if(ehRoupa(p)&&provaData>=data){aviso('A prova deve acontecer antes da locação');$('fProvaData').focus();return}
    sacola.push({id:p.id,tamanho:$('fTamanho').value,data,devolucao:diaSeguinte(data),modo:$('fModo').value,provaData,provaPeriodo});
    adicionou=true;salvarSacola();pulsar($('abrirSacola'));fecharPainel();aviso('Peça adicionada à sacola');
  });
}

/* ---------- sacola e favoritos ---------- */
function abrirSacola(){
  const linhas=sacola.map((x,i)=>{const p=PORID[x.id];return '<div class="linha-sacola"><div class="mini">'+(p.photo?fotoHTML(p):'')+'</div><div>'+
    '<strong>'+esc(p.name)+'</strong><p>'+esc(p.code)+' · Tamanho '+esc(x.tamanho)+'</p>'+
    '<p>Locação: '+dataBR(x.data)+' a '+dataBR(x.devolucao)+'</p>'+
    (x.provaData?'<p>Prova: '+dataBR(x.provaData)+' · '+esc(x.provaPeriodo)+'</p>':'')+
    '<p>'+esc(x.modo)+'</p><button class="link-acao" type="button" data-remover="'+i+'">Remover</button></div></div>'}).join('');
  abrirPainel('Sacola de locação',sacola.length?
    linhas+'<p class="painel-nota">A sacola é uma consulta: a EVY confirma a disponibilidade e a reserva só é efetivada após o pagamento.</p><button class="botao botao--rosa" type="button" id="enviarWhats" style="width:100%">Consultar pelo WhatsApp</button>':
    '<p class="painel-vazio">Sua sacola está vazia. Arraste uma peça da arara até a sacola ou escolha no acervo.</p><a class="botao botao--preto" href="#acervo" id="irAcervo">Ver o acervo</a>');
  $('painelCorpo').querySelectorAll('[data-remover]').forEach(b=>b.onclick=()=>{sacola.splice(Number(b.dataset.remover),1);salvarSacola();abrirSacola()});
  if($('enviarWhats'))$('enviarWhats').onclick=enviarWhatsApp;
  if($('irAcervo'))$('irAcervo').onclick=()=>fecharPainel(true);
}
function enviarWhatsApp(){
  if(!sacola.length)return;
  const mesmo=sacola.every(x=>x.data===sacola[0].data);
  const abre=sacola.length===1?'Oi, EVY! Essa peça está disponível':'Oi, EVY! Essas peças estão disponíveis';
  const pergunta=mesmo?abre+' para o período de '+dataBR(sacola[0].data)+' a '+dataBR(sacola[0].devolucao)+'?':abre+' para os períodos abaixo?';
  const itens=sacola.map((x,i)=>{const p=PORID[x.id];return (i+1)+'. '+p.name+'\nCódigo: '+p.code+'\nTamanho: '+x.tamanho+
    '\nLocação: '+dataBR(x.data)+' a '+dataBR(x.devolucao)+
    (x.provaData?'\nSolicitação de prova: '+dataBR(x.provaData)+' no período da '+x.provaPeriodo+' (a confirmar)':'')+
    '\nModalidade: '+x.modo+(p.photo?'\nFoto da peça: '+SITE+p.photo:'')+'\nVer no acervo: '+SITE+'#peca-'+encodeURIComponent(p.id)});
  window.open('https://wa.me/'+WHATSAPP+'?text='+encodeURIComponent([pergunta,'',...itens].join('\n\n')),'_blank','noopener');
}
function abrirFavoritos(){
  const lista=[...favoritos].map(id=>PORID[id]);
  abrirPainel('Favoritos',lista.length?
    '<p class="painel-nota">Seus favoritos ficam salvos neste navegador.</p>'+lista.map(p=>'<div class="linha-sacola"><div class="mini">'+(p.photo?fotoHTML(p):'')+'</div><div><strong>'+esc(p.name)+'</strong><p>'+esc(p.size.join(' / '))+' · '+precoTexto(p)+'</p>'+
    '<button class="link-acao" type="button" data-ver="'+esc(p.id)+'">Ver peça</button> &nbsp; <button class="link-acao" type="button" data-desfavoritar="'+esc(p.id)+'">Remover</button></div></div>').join(''):
    '<p class="painel-vazio">Toque no coração de uma peça para guardá-la aqui.</p>');
  $('painelCorpo').querySelectorAll('[data-ver]').forEach(b=>b.onclick=()=>abrirPeca(PORID[b.dataset.ver]));
  $('painelCorpo').querySelectorAll('[data-desfavoritar]').forEach(b=>b.onclick=()=>{alternarFavorito(b.dataset.desfavoritar);abrirFavoritos()});
}
$('abrirSacola').onclick=abrirSacola;
$('abrirFavoritos').onclick=abrirFavoritos;
document.addEventListener('click',e=>{const b=e.target.closest('[data-favoritar]');if(b){e.preventDefault();e.stopPropagation();alternarFavorito(b.dataset.favoritar)}},true);

/* ---------- menu do celular ---------- */
function fecharMenu(){$('menuCelular').hidden=true;$('abrirMenu').setAttribute('aria-expanded','false')}
$('abrirMenu').onclick=()=>{const abre=$('menuCelular').hidden;$('menuCelular').hidden=!abre;$('abrirMenu').setAttribute('aria-expanded',String(abre))};
$('menuCelular').addEventListener('click',e=>{if(e.target.closest('a'))fecharMenu()});

/* ================= VITRINE ================= */
const palco=$('palco'),rolagem=$('araraRolagem'),sacolaCena=$('sacolaCena');
const cabideSVG='<svg class="cabide" viewBox="0 0 160 90" aria-hidden="true"><path class="gancho" d="M80 36V22c0-11 12-15 17-7 4 6-1 13-8 12"/><path class="ombro" d="M80 36 14 75q-8 5 2 5h128q10 0 2-5Z"/><path class="brilho" d="M77 40 24 72"/></svg>';
let pecaPendente=null;

VITRINE.forEach(v=>{
  const p=PORID[v.id];if(!p)return;
  const li=document.createElement('li');
  li.innerHTML='<button class="peca'+(v.semCabide?' sem-cabide':'')+'" type="button" data-id="'+esc(p.id)+'" style="--len:'+v.length+'" aria-label="'+esc(p.name)+': toque para ver detalhes ou arraste até a sacola">'+
    '<span class="peca-corpo">'+(v.semCabide?'':cabideSVG)+'<img class="peca-foto" src="'+esc(v.img)+'" alt="" draggable="false" decoding="async"></span>'+
    '<span class="peca-nome" aria-hidden="true">'+esc(p.name)+'</span></button>';
  $('araraPecas').append(li);
});

/* Barra ondulada: a curva acompanha a largura da arara e cada peça pende na altura da barra. */
const arara=$('arara'),curva=$('araraCurva');
function alturaBarra(x,W,H){
  const t=x/W,base=H*.21,amp=H*.032;
  return base+amp*Math.sin(2*Math.PI*1.15*t+.5)+(t>.96?Math.pow((t-.96)/.06,2)*H*.05:0);
}
function desenharArara(){
  const W=arara.offsetWidth,H=arara.offsetHeight;if(!W||!H)return;
  const espessura=H*.013,pts=[];
  for(let i=0;i<=80;i++){const x=-W*.02+(W*1.04)*i/80;pts.push(x.toFixed(1)+','+alturaBarra(x,W,H).toFixed(1))}
  const d='M'+pts.join(' L');
  curva.setAttribute('viewBox','0 0 '+W+' '+H);
  curva.innerHTML='<defs><linearGradient id="evyMadeira" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A58560"/><stop offset=".45" stop-color="#76583A"/><stop offset="1" stop-color="#4C3824"/></linearGradient></defs>'+
    '<path class="sombra" d="'+d+'" transform="translate('+(espessura*1.2)+','+(espessura*2.4)+')" stroke-width="'+espessura+'"/>'+
    '<path class="madeira" d="'+d+'" stroke-width="'+espessura+'"/>';
  const ar=arara.getBoundingClientRect(),base=H*.21;
  document.querySelectorAll('#araraPecas>li').forEach(li=>{
    const r=li.getBoundingClientRect(),cx=r.left+r.width/2-ar.left;
    li.style.setProperty('--dy',(alturaBarra(cx,W,H)-base).toFixed(1)+'px');
  });
}
new ResizeObserver(desenharArara).observe(arara);
document.querySelectorAll('.peca-foto').forEach(img=>{if(!img.complete)img.addEventListener('load',desenharArara,{once:true})});
desenharArara();

/* Pêndulo amortecido: cada peça balança a partir do gancho. */
const pendulos=new Map();let loopPendulo=0,ultimoPendulo=0;
function balancar(btn,impulso){
  if(movimentoReduzido())return;
  const s=pendulos.get(btn)||{a:0,v:0};s.v+=impulso;pendulos.set(btn,s);
  if(!loopPendulo){ultimoPendulo=performance.now();loopPendulo=requestAnimationFrame(passoPendulo)}
}
function passoPendulo(t){
  const dt=Math.min(.033,(t-ultimoPendulo)/1000);ultimoPendulo=t;
  pendulos.forEach((s,btn)=>{
    s.v+=(-34*s.a-2.4*s.v)*dt;s.a+=s.v*dt;s.a=Math.max(-28,Math.min(28,s.a));
    btn.style.setProperty('--balanco',s.a.toFixed(2)+'deg');
    if(Math.abs(s.a)<.03&&Math.abs(s.v)<.05){pendulos.delete(btn);btn.style.setProperty('--balanco','0deg')}
  });
  loopPendulo=pendulos.size?requestAnimationFrame(passoPendulo):0;
}
/* Entrada: as peças balançam levemente, uma após a outra. */
document.querySelectorAll('.peca').forEach((b,i)=>setTimeout(()=>balancar(b,(i%2?-1:1)*22),250+i*110));
/* Passar o mouse empurra a peça na direção do movimento. */
document.querySelectorAll('.peca').forEach(b=>b.addEventListener('pointermove',e=>{
  if(e.pointerType!=='mouse'||arraste)return;
  const s=pendulos.get(b);if(s&&Math.abs(s.v)>25)return;
  balancar(b,Math.max(-30,Math.min(30,e.movementX*2.2)));
}));

/* Arraste com física: a peça segue o ponteiro e balança conforme a aceleração. */
let arraste=null,ignorarClique=false;
function retanguloSacola(){const r=sacolaCena.getBoundingClientRect(),m=Math.max(24,r.width*.18);return{l:r.left-m,r:r.right+m,t:r.top-m*1.6,b:r.bottom+m*.4}}
function sobreSacola(x,y){const r=retanguloSacola();return x>=r.l&&x<=r.r&&y>=r.t&&y<=r.b}

palco.addEventListener('pointerdown',e=>{
  const btn=e.target.closest('.peca');
  if(!btn||btn.classList.contains('na-sacola')||arraste||(e.pointerType==='mouse'&&e.button!==0))return;
  arraste={btn,id:e.pointerId,x0:e.clientX,y0:e.clientY,x:e.clientX,y:e.clientY,tipo:e.pointerType,ativo:false};
});
window.addEventListener('pointermove',e=>{
  const g=arraste;if(!g||e.pointerId!==g.id)return;
  g.x=e.clientX;g.y=e.clientY;
  if(!g.ativo){
    const dx=g.x-g.x0,dy=g.y-g.y0;
    if(Math.hypot(dx,dy)<8)return;
    if(g.tipo==='touch'&&Math.abs(dx)>Math.abs(dy)){arraste=null;return} // deslizar a arara
    iniciarArraste(g);
  }
  if(e.cancelable)e.preventDefault();
},{passive:false});
window.addEventListener('pointerup',e=>{
  const g=arraste;if(!g||e.pointerId!==g.id)return;
  arraste=null;if(!g.ativo)return;
  ignorarClique=true;setTimeout(()=>ignorarClique=false,60);
  g.ativo=false;cancelAnimationFrame(g.raf);
  sacolaCena.classList.remove('alvo');
  if(sobreSacola(g.x,g.y))soltarNaSacola(g);else devolver(g);
});
window.addEventListener('pointercancel',e=>{
  const g=arraste;if(!g||e.pointerId!==g.id)return;
  arraste=null;if(g.ativo){g.ativo=false;cancelAnimationFrame(g.raf);sacolaCena.classList.remove('alvo');devolver(g)}
});
/* Impede a rolagem da página enquanto a peça é arrastada no celular. */
palco.addEventListener('touchmove',e=>{if(arraste&&arraste.ativo&&e.cancelable)e.preventDefault()},{passive:false});

function iniciarArraste(g){
  g.ativo=true;
  try{g.btn.setPointerCapture(g.id)}catch(_){}
  const foto=g.btn.querySelector('.peca-foto'),fr=foto.getBoundingClientRect(),pr=palco.getBoundingClientRect();
  g.w=fr.width;g.h=fr.height;
  g.pivo={x:fr.left+fr.width/2-pr.left,y:fr.top-pr.top};   // topo da peça, onde o cabide segura
  g.casa={...g.pivo};
  g.off={x:g.pivo.x-(g.x0-pr.left),y:g.pivo.y-(g.y0-pr.top)};
  g.vel={x:0,y:0};g.ang=0;g.angV=0;g.escala=1;
  const voando=document.createElement('div');voando.className='peca-voando';
  voando.style.width=g.w+'px';voando.style.height=g.h+'px';
  voando.innerHTML='<img src="'+foto.getAttribute('src')+'" alt="" draggable="false">';
  palco.append(voando);g.no=voando;
  g.btn.classList.add('arrastando');balancar(g.btn,(Math.random()>.5?1:-1)*70);
  desenhar(g);
  g.t=performance.now();g.raf=requestAnimationFrame(t=>passoArraste(g,t));
}
function desenhar(g){g.no.style.transform='translate('+(g.pivo.x-g.w/2).toFixed(1)+'px,'+g.pivo.y.toFixed(1)+'px) rotate('+g.ang.toFixed(2)+'deg) scale('+g.escala.toFixed(3)+')'}
function passoArraste(g,t){
  if(!g.ativo)return;
  const dt=Math.min(.033,Math.max(.001,(t-g.t)/1000));g.t=t;
  const pr=palco.getBoundingClientRect();
  const alvo={x:g.x-pr.left+g.off.x,y:g.y-pr.top+g.off.y};
  const k=1-Math.exp(-dt*22);
  const nx=g.pivo.x+(alvo.x-g.pivo.x)*k,ny=g.pivo.y+(alvo.y-g.pivo.y)*k;
  const vx=(nx-g.pivo.x)/dt,ax=(vx-g.vel.x)/dt;
  g.vel={x:vx,y:(ny-g.pivo.y)/dt};g.pivo={x:nx,y:ny};
  // Pêndulo: o tecido "fica para trás" quando a mão acelera.
  g.angV+=(-38*g.ang-5.5*g.angV-ax*.011)*dt;g.ang+=g.angV*dt;g.ang=Math.max(-38,Math.min(38,g.ang));
  g.escala+=(1.06-g.escala)*k;
  desenhar(g);
  sacolaCena.classList.toggle('alvo',sobreSacola(g.x,g.y));
  g.raf=requestAnimationFrame(tt=>passoArraste(g,tt));
}
function devolver(g){
  const de=g.no.style.transform;
  const para='translate('+(g.casa.x-g.w/2)+'px,'+g.casa.y+'px) rotate(0deg) scale(1)';
  const fim=()=>{g.no.remove();g.btn.classList.remove('arrastando');balancar(g.btn,-g.ang*4)};
  if(movimentoReduzido()||!g.no.animate){fim();return}
  g.no.animate([{transform:de},{transform:para}],{duration:420,easing:'cubic-bezier(.2,.8,.25,1)'}).onfinish=fim;
}
function soltarNaSacola(g){
  const id=g.btn.dataset.id,p=PORID[id];
  const pr=palco.getBoundingClientRect(),sr=sacolaCena.getBoundingClientRect();
  const bocaX=sr.left+sr.width/2-pr.left,bocaY=sr.top+sr.height*.22-pr.top;
  const de=g.no.style.transform;
  const meio='translate('+(bocaX-g.w/2)+'px,'+(bocaY-g.h*.42)+'px) rotate('+(g.ang*.3)+'deg) scale(.42)';
  const fim='translate('+(bocaX-g.w/2)+'px,'+(bocaY+sr.height*.18-g.h*.3)+'px) rotate(0deg) scale(.3)';
  pecaPendente=id;g.btn.classList.remove('arrastando');atualizarContadores();
  const concluir=()=>{
    g.no.remove();
    sacolaCena.classList.remove('recebeu');void sacolaCena.offsetWidth;sacolaCena.classList.add('recebeu');
    setTimeout(()=>abrirPeca(p,{fechou:()=>{pecaPendente=null;atualizarContadores()}}),movimentoReduzido()?0:380);
  };
  if(movimentoReduzido()||!g.no.animate){concluir();return}
  const a1=g.no.animate([{transform:de},{transform:meio}],{duration:260,easing:'cubic-bezier(.3,.6,.4,1)',fill:'forwards'});
  a1.onfinish=()=>{g.no.classList.add('caindo');g.no.animate([{transform:meio,opacity:1},{transform:fim,opacity:.9}],{duration:240,easing:'cubic-bezier(.5,0,.8,.6)',fill:'forwards'}).onfinish=concluir};
}
/* Toque/clique sem arrastar: abre os detalhes da peça. */
palco.addEventListener('click',e=>{
  const btn=e.target.closest('.peca');
  if(!btn||ignorarClique||btn.classList.contains('na-sacola'))return;
  balancar(btn,40);abrirPeca(PORID[btn.dataset.id]);
});
sacolaCena.addEventListener('click',()=>{if(!ignorarClique)abrirSacola()});

/* ================= ACERVO ================= */
const TIPOS=['Todos','Vestidos','Conjuntos','Jaquetas','Bolsas'];
const POR_PAGINA=12;
let filtroTipo='Todos',filtroTamanho='Todos',mostrando=POR_PAGINA;
const ordenado=[...ACERVO].sort((a,b)=>(!!b.photo)-(!!a.photo)); // peças com foto primeiro (ordem estável)
const ordemTam=s=>{const i=['P','M','G'].indexOf(s);if(i>=0)return i;const n=parseInt(s,10);return isNaN(n)?200:10+n};
const tamanhos=[...new Set(ACERVO.flatMap(p=>p.size))].filter(s=>s!=='A confirmar').sort((a,b)=>ordemTam(a)-ordemTam(b)||a.localeCompare(b));

$('filtrosTipo').innerHTML=TIPOS.map(t=>'<button class="chip" type="button" data-tipo="'+t+'" aria-pressed="'+(t===filtroTipo)+'">'+t+'</button>').join('');
$('filtroTamanho').innerHTML='<option value="Todos">Todos</option>'+tamanhos.map(s=>'<option>'+esc(s)+'</option>').join('');
$('filtrosTipo').addEventListener('click',e=>{const b=e.target.closest('[data-tipo]');if(!b)return;filtroTipo=b.dataset.tipo;mostrando=POR_PAGINA;
  $('filtrosTipo').querySelectorAll('[data-tipo]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));desenharAcervo()});
$('filtroTamanho').addEventListener('change',e=>{filtroTamanho=e.target.value;mostrando=POR_PAGINA;desenharAcervo()});
$('verMais').addEventListener('click',()=>{mostrando+=POR_PAGINA;desenharAcervo()});

function filtrados(){return ordenado.filter(p=>(filtroTipo==='Todos'||p.kind===filtroTipo)&&(filtroTamanho==='Todos'||p.size.includes(filtroTamanho)))}
function desenharAcervo(){
  const lista=filtrados(),visiveis=lista.slice(0,mostrando);
  $('grade').innerHTML=visiveis.map(p=>'<li class="cartao" id="peca-'+esc(p.id)+'">'+
    '<button class="cartao-abrir" type="button" data-abrir="'+esc(p.id)+'"><span class="cartao-foto">'+fotoHTML(p)+'</span>'+
    '<span class="cartao-info"><strong>'+esc(p.name)+'</strong><span>'+(p.color?esc(p.color)+' · ':'')+esc(p.size.join(' / '))+'</span><span class="cartao-preco">'+precoTexto(p)+'</span></span></button>'+
    '<button class="favoritar" type="button" data-favoritar="'+esc(p.id)+'" aria-pressed="'+favoritos.has(p.id)+'" aria-label="Favoritar '+esc(p.name)+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.9a5.5 5.5 0 0 0-7.8 0L12 6l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.3a5.5 5.5 0 0 0 0-7.8Z"/></svg></button></li>').join('');
  $('acervoTotal').textContent=lista.length+(lista.length===1?' peça':' peças')+(lista.length>visiveis.length?' · mostrando '+visiveis.length:'');
  const resto=lista.length-visiveis.length;
  $('verMais').hidden=resto<=0;$('verMais').textContent='Ver mais peças ('+resto+')';
}
$('grade').addEventListener('click',e=>{const b=e.target.closest('[data-abrir]');if(b)abrirPeca(PORID[b.dataset.abrir])});

/* Link direto para uma peça (#peca-id), usado na mensagem do WhatsApp. */
function abrirPorEndereco(){
  if(!location.hash.startsWith('#peca-'))return;
  const id=decodeURIComponent(location.hash.slice(6)),p=PORID[id];if(!p)return;
  filtroTipo='Todos';filtroTamanho='Todos';
  mostrando=Math.max(POR_PAGINA,Math.ceil((ordenado.indexOf(p)+1)/POR_PAGINA)*POR_PAGINA);desenharAcervo();
  const card=$('peca-'+id);
  if(card){card.classList.add('destacado');card.scrollIntoView({block:'center'})}
  abrirPeca(p);
}

desenharAcervo();atualizarContadores();abrirPorEndereco();
window.addEventListener('hashchange',abrirPorEndereco);
$('ano').textContent=new Date().getFullYear();
})();
