import { useState, useRef, useEffect } from "react";

import LOGO_B64 from "./logo.png";


/* ─── TOKENS ─────────────────────────────────────────────── */
const T = {
  gold:"#7C3AED", goldL:"#F3EEFF", goldM:"#C4A0FA",
  dark:"#0D0B12",
  n0:"#FFFFFF", n50:"#FAFAF9", n100:"#F5F4F8",
  n200:"#E8E6EE", n300:"#CEC9DC", n400:"#9991AF",
  n600:"#5C5575", n700:"#3A3450", n900:"#111020",
  ok:"#166534", okBg:"#DCFCE7",
  warn:"#854D0E", warnBg:"#FEF9C3",
  err:"#991B1B", errBg:"#FEE2E2",
};

/* ─── UTILS ──────────────────────────────────────────────── */
const calcScore = f => {
  let s = 0;
  s += Math.min((parseFloat(f.nota)||0)/5*25,25);
  s += Math.min((parseInt(f.numAvals)||0)/200*20,20);
  s += Math.min((parseInt(f.numFotos)||0)/20*15,15);
  if(f.temSite) s+=10; if(f.temWhats) s+=10; if(f.postsAtivos) s+=10;
  s += {nenhuma:0,raramente:3,mensal:5,semanal:8,diaria:10}[f.frequencia]||0;
  return Math.round(Math.min(s,100));
};
const calcIgScore = ig => {
  let s=0;
  if(ig.bioOtimizada) s+=15;
  s += {nenhuma:0,raramente:5,mensal:8,semanal:14,diaria:20}[ig.frequencia]||0;
  s += {ruim:0,media:8,boa:15}[ig.qualVisual]||0;
  s += {nenhum:0,parcial:12,completo:20}[ig.contAutoridade]||0;
  s += Math.round(Math.min((parseFloat(ig.engRate)||0)/3*25,25));
  if(ig.linkBio) s+=5;
  return Math.round(Math.min(s,100));
};
const qrUrl = t => `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(t)}&margin=10&color=0D0D0B`;
const waLink = n => { const c=(n||"").replace(/\D/g,""); return c?`https://wa.me/${c.startsWith("55")?c:"55"+c}`:""; };
const PRESET_KEY = "scentral_v7_presets";
const loadPresets = () => { try { return JSON.parse(localStorage.getItem(PRESET_KEY)||"[]"); } catch { return []; } };
const savePresets = p => localStorage.setItem(PRESET_KEY, JSON.stringify(p));

/* ─── NICHOS ─────────────────────────────────────────────── */
const NICHOS = {
  clinica:{label:"Clínica Médica",kws:["clínica médica","médico particular","consulta médica"],cliente:"paciente",acao:"agendar consulta",positivo:"qualidade de atendimento reconhecida pelos pacientes"},
  vet:{label:"Veterinária",kws:["clínica veterinária","veterinário","pet"],cliente:"tutor",acao:"agendar atendimento",positivo:"cuidado e dedicação com os animais"},
  restaurante:{label:"Restaurante",kws:["restaurante","delivery","almoço"],cliente:"cliente",acao:"fazer pedido",positivo:"qualidade da culinária"},
  adv:{label:"Advocacia",kws:["advogado","escritório jurídico"],cliente:"cliente",acao:"buscar orientação",positivo:"expertise jurídica reconhecida"},
  odonto:{label:"Odontologia",kws:["dentista","clínica odontológica"],cliente:"paciente",acao:"agendar avaliação",positivo:"qualidade técnica e cuidado"},
  academia:{label:"Academia",kws:["academia","personal trainer"],cliente:"aluno",acao:"começar a treinar",positivo:"resultados reais dos alunos"},
  salao:{label:"Beleza",kws:["salão de beleza","cabeleireiro"],cliente:"cliente",acao:"agendar horário",positivo:"talento e atenção aos detalhes"},
  imob:{label:"Imobiliária",kws:["imobiliária","comprar imóvel"],cliente:"cliente",acao:"encontrar imóvel",positivo:"conhecimento do mercado local"},
  contabil:{label:"Contabilidade",kws:["contador","contabilidade"],cliente:"empresa",acao:"organizar contabilidade",positivo:"confiança e rigor técnico"},
  escola:{label:"Educação",kws:["escola","cursos"],cliente:"aluno",acao:"matricular",positivo:"metodologia de ensino"},
  psico:{label:"Psicologia",kws:["psicólogo","terapia"],cliente:"paciente",acao:"agendar sessão",positivo:"escuta qualificada"},
  outro:{label:"Outro",kws:[],cliente:"cliente",acao:"entrar em contato",positivo:"qualidade do serviço"},
};

/* ─── 3 TONS ─────────────────────────────────────────────── */
const TONS = {
  original: {
    label: "Original",
    desc: "Direto e provocativo — expõe o problema com clareza",
    instrucao: `Tom direto e provocativo, como uma consultoria que aponta os problemas claramente. Use linguagem assertiva: "sua presença está abaixo", "pacientes estão escolhendo outros", "você está perdendo oportunidades". Crie senso de urgência real. Seja contundente mas profissional. Aponte as lacunas diretamente sem suavizar.`,
  },
  parceiro: {
    label: "Parceiro",
    desc: "Amigável — valoriza o que já existe e propõe melhorias",
    instrucao: `Tom amigável e consultivo. SEMPRE comece pelos pontos positivos reais. Apresente gaps como oportunidades de crescimento, nunca como falhas. Use "próximo nível", "oportunidade", "potencial". Posicione-se como parceiro estratégico. Termine com proposta de conversa descomplicada.`,
  },
  autoridade: {
    label: "Autoridade",
    desc: "Especialista — educa com dados, benchmarks e metodologia",
    instrucao: `Tom de especialista que educa. Use dados e benchmarks do mercado. Cite métricas comparativas. Posicione o consultor como maior referência técnica do segmento. Reconheça os acertos antes de apresentar pontos de evolução. Cada observação deve ser embasada em critérios do algoritmo Google.`,
  },
};

/* ─── TEXTOS PADRÃO ──────────────────────────────────────── */
function textosPadrao(form, concs) {
  const n = NICHOS[form.nichoKey]||NICHOS.outro;
  const empresa = form.cslEmpresa||"nossa consultoria";
  const neg = form.nome||"seu negócio";
  const cat = form.categoria||"segmento";
  const cid = form.cidade||"sua cidade";
  const tom = form.tom||"original";

  const t = {
    original: {
      tituloIntro: "Diagnóstico de Presença Digital",
      tituloAnalise: "Rede de Pesquisa (Google)",
      tituloConc: "Comparação com a concorrência",
      tituloIg: "Presença no Instagram",
      tituloProx: "Próximos Passos",
      intro: `Meu nome é <strong>${form.cslNome||"o consultor"}</strong>, fundador da <strong>${empresa}</strong>, especializada em aumentar o reconhecimento e o faturamento de negócios do segmento de <strong>${cat}</strong>. Recentemente analisei a presença digital de negócios em <strong>${cid}</strong> e fiz uma leitura técnica do seu posicionamento no Google. Essa análise não é baseada em opinião — ela segue critérios reais de como o Google mostra os negócios e, principalmente, <strong>como o cliente decide com quem vai fechar</strong>.`,
      problema: `Quando alguém pesquisa por <strong>${cat} em ${cid}</strong>, essa pessoa já está pronta para ${n.acao}. E, normalmente, ela entra em contato com um dos <strong>3 primeiros que aparecem</strong>. Hoje, sua presença no Google está abaixo do potencial da sua qualificação — não por falta de competência, mas por um <strong>posicionamento que ainda não reflete o que você oferece</strong> para quem não te conhece. Existem ${n.cliente}s procurando exatamente o que você faz, mas seu nome não está aparecendo com a frequência que deveria.`,
      dados: `Atualmente você aparece na posição <strong>#${form.posicao||"—"}</strong> nas buscas por ${cat} em ${cid}. Com nota <strong>${form.nota}★</strong>, <strong>${form.numAvals} avaliações</strong> e score de presença <strong>${form.score}/100</strong>, existem ajustes estratégicos claros que, feitos corretamente, mudam significativamente sua visibilidade.`,
      diferenciais: `Os negócios que aparecem antes possuem fichas mais completas, mais avaliações recentes e maior frequência de atualização — fatores que o algoritmo do Google prioriza diretamente. <strong>Esses ${n.cliente}s acabam escolhendo outros que aparecem primeiro</strong>, muitas vezes com menos qualidade, mas com mais visibilidade digital.`,
      igAnalise: `Seu Instagram apresenta oportunidades claras de crescimento. A frequência de publicações e o tipo de conteúdo impactam diretamente o alcance orgânico e a percepção de autoridade pelo ${n.cliente}. <strong>Sem uma estratégia consistente, seu perfil deixa de converter visitantes em ${n.cliente}s.</strong>`,
      proximos: `Este diagnóstico tem como objetivo fornecer uma <strong>visão inicial</strong> sobre seu momento atual. O próximo passo é marcarmos uma conversa para que eu me aprofunde nessa análise e explique como corrigir essas lacunas identificadas — além de apresentar outras oportunidades de crescimento. Entre em contato com <strong>${form.cslNome||"o consultor"}</strong> agora.`,
    },
    parceiro: {
      tituloIntro: "Uma análise feita com atenção",
      tituloAnalise: "Sua presença digital hoje",
      tituloConc: "O cenário ao seu redor",
      tituloIg: "Seu Instagram — potencial identificado",
      tituloProx: "Como posso ajudar",
      intro: `Meu nome é <strong>${form.cslNome||"o consultor"}</strong>, da <strong>${empresa}</strong>. Dediquei um tempo para analisar com cuidado a presença digital do <strong>${neg}</strong> — e o que encontrei me motivou a entrar em contato. Você já tem uma base real de qualidade: <strong>${n.positivo}</strong>. O que quero te mostrar é como tornar isso ainda mais visível para quem está buscando um <strong>${cat}</strong> em <strong>${cid}</strong>.`,
      problema: `Você já conquistou o que é mais difícil: a <strong>confiança dos seus ${n.cliente}s</strong>. A oportunidade agora está em fazer com que essa mesma qualidade apareça para quem ainda não te conhece — as pessoas que buscam por <strong>${cat} em ${cid}</strong> e tomam a decisão de ${n.acao} no momento da busca.`,
      dados: `Sua nota de <strong>${form.nota}★</strong> no Google já está acima de vários concorrentes da região${form.temSite?" e seu site ativo complementa bem essa presença":""}. Com <strong>${form.numAvals} avaliações</strong> e score de presença de <strong>${form.score}/100</strong>, existem pontos estratégicos que, ajustados, colocam seu nome em uma posição muito mais favorável.`,
      diferenciais: `Os negócios que aparecem nas primeiras posições chegaram lá com ações simples e consistentes — mais fotos, avaliações recentes e ficha completa. São ajustes que fazem diferença real no número de ${n.cliente}s que chegam até você, e a sua qualidade de serviço é o diferencial que fecha a conversão.`,
      igAnalise: `Seu perfil já <strong>comunica sua especialidade</strong> e transmite profissionalismo. O próximo passo é simples: <strong>consistência e dois ajustes técnicos</strong> que colocam seu perfil em outro nível de visibilidade e conversão de ${n.cliente}s.`,
      proximos: `Gostaria de te mostrar, em uma conversa rápida, um caminho claro e personalizado para o <strong>${neg}</strong> em <strong>${cid}</strong>. Sem complicação — só ações práticas que fazem sentido para o seu momento. <strong>${form.cslNome||"Estou"}</strong> à disposição quando for melhor para você.`,
    },
    autoridade: {
      tituloIntro: "Análise técnica de posicionamento",
      tituloAnalise: "Diagnóstico de presença — Google",
      tituloConc: "Benchmarking competitivo",
      tituloIg: "Análise de autoridade — Instagram",
      tituloProx: "Plano de ação recomendado",
      intro: `Sou <strong>${form.cslNome||"especialista"}</strong> da <strong>${empresa}</strong>, com metodologia baseada nos critérios técnicos do algoritmo Google para ranqueamento de negócios locais no segmento de <strong>${cat}</strong>. Realizei uma análise completa da presença digital do <strong>${neg}</strong> em <strong>${cid}</strong>. Os dados revelam uma base sólida com oportunidades técnicas específicas e acionáveis.`,
      problema: `Segundo o comportamento de busca local, mais de 76% dos ${n.cliente}s entram em contato com um dos 3 primeiros resultados. O algoritmo do Google avalia ficha completa, volume e recência de avaliações, presença de fotos e frequência de atualização. O <strong>${neg}</strong> tem os atributos de qualidade — o que falta é o posicionamento técnico correto para que isso seja reconhecido pelo algoritmo.`,
      dados: `A nota de <strong>${form.nota}★</strong> com <strong>${form.numAvals} avaliações</strong> posiciona o <strong>${neg}</strong> com boa reputação base. O score de presença digital de <strong>${form.score}/100</strong> indica gaps técnicos específicos: são exatamente esses pontos que determinam a diferença de posicionamento entre você e os líderes do segmento em ${cid}.`,
      diferenciais: `Os líderes do segmento em ${cid} utilizam sinais que o algoritmo do Google prioriza: volume de avaliações recentes, galeria de fotos atualizada, horários completos e posts regulares. Cada um desses sinais contribui com pontos no score de relevância local — e todos são corrigíveis com um plano técnico estruturado.`,
      igAnalise: `O Instagram é o segundo canal de decisão para ${n.cliente}s — pesquisas indicam que 67% verificam o perfil antes de entrar em contato. O algoritmo do Instagram distribui conteúdo com base em frequência, formato (Reels têm 3x mais alcance) e engajamento. <strong>Uma estratégia de conteúdo técnico bem executada posiciona você como referência do segmento em ${cid}.</strong>`,
      proximos: `A <strong>${empresa}</strong> desenvolveu uma metodologia específica para <strong>${cat}</strong>. Em uma sessão de diagnóstico aprofundado, apresento o roadmap técnico completo — com metas de posicionamento, cronograma e métricas de acompanhamento. Entre em contato com <strong>${form.cslNome||"o consultor"}</strong> para agendar.`,
    },
  };
  return t[tom]||t.original;
}

/* ─── GAUGE ──────────────────────────────────────────────── */
function GaugeSVG({score,size=200}) {
  const sc=Math.max(0,Math.min(100,parseInt(score)||0));
  const rad=(-180+(sc/100)*180)*Math.PI/180;
  const nx=(110+80*Math.cos(rad)).toFixed(1), ny=(105+80*Math.sin(rad)).toFixed(1);
  const col=sc<40?"#DC2626":sc<70?"#F59E0B":T.gold;
  return(
    <svg width={size} viewBox="0 0 220 135" style={{display:"block",margin:"0 auto"}}>
      <defs><linearGradient id="gg" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#DC2626"/><stop offset="40%" stopColor="#F59E0B"/>
        <stop offset="70%" stopColor={T.goldM}/><stop offset="100%" stopColor={T.gold}/>
      </linearGradient></defs>
      <path d="M30 105 A80 80 0 0 1 190 105" fill="none" stroke={T.n200} strokeWidth="18" strokeLinecap="round"/>
      <path d="M30 105 A80 80 0 0 1 190 105" fill="none" stroke="url(#gg)" strokeWidth="18" strokeLinecap="round"/>
      <text x="22" y="122" fontSize="10" fill={T.n400} textAnchor="middle" fontFamily="Manrope,sans-serif">0</text>
      <text x="110" y="20" fontSize="10" fill={T.n400} textAnchor="middle" fontFamily="Manrope,sans-serif">50</text>
      <text x="198" y="122" fontSize="10" fill={T.n400} textAnchor="middle" fontFamily="Manrope,sans-serif">100</text>
      <line x1="110" y1="105" x2={nx} y2={ny} stroke={T.dark} strokeWidth="3.5" strokeLinecap="round"/>
      <circle cx="110" cy="105" r="6" fill={T.dark}/>
      <text x="110" y="133" fontSize="22" fontWeight="800" fill={col} textAnchor="middle" fontFamily="Manrope,sans-serif">{sc}</text>
    </svg>
  );
}
function gaugeStatic(sc) {
  const s=Math.max(0,Math.min(100,parseInt(sc)||0));
  const rad=(-180+(s/100)*180)*Math.PI/180;
  const nx=(110+80*Math.cos(rad)).toFixed(1), ny=(105+80*Math.sin(rad)).toFixed(1);
  const col=s<40?"#DC2626":s<70?"#F59E0B":T.gold;
  return `<svg width="200" height="130" viewBox="0 0 220 135" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto"><defs><linearGradient id="gs" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#DC2626"/><stop offset="40%" stop-color="#F59E0B"/><stop offset="70%" stop-color="${T.goldM}"/><stop offset="100%" stop-color="${T.gold}"/></linearGradient></defs><path d="M30 105 A80 80 0 0 1 190 105" fill="none" stroke="${T.n200}" stroke-width="18" stroke-linecap="round"/><path d="M30 105 A80 80 0 0 1 190 105" fill="none" stroke="url(#gs)" stroke-width="18" stroke-linecap="round"/><text x="22" y="122" font-size="10" fill="${T.n400}" text-anchor="middle" font-family="Manrope,sans-serif">0</text><text x="110" y="20" font-size="10" fill="${T.n400}" text-anchor="middle" font-family="Manrope,sans-serif">50</text><text x="198" y="122" font-size="10" fill="${T.n400}" text-anchor="middle" font-family="Manrope,sans-serif">100</text><line x1="110" y1="105" x2="${nx}" y2="${ny}" stroke="${T.dark}" stroke-width="3.5" stroke-linecap="round"/><circle cx="110" cy="105" r="6" fill="${T.dark}"/><text x="110" y="133" font-size="22" font-weight="800" fill="${col}" text-anchor="middle" font-family="Manrope,sans-serif">${s}</text></svg>`;
}

/* ─── MAPAS SVG ──────────────────────────────────────────── */
function makeMapSVG({concs=[],cidade="Cidade",nome="Negócio",cor1=T.gold}) {
  const W=640,H=300;
  const pts=[[.18,.28],[.52,.18],[.74,.36],[.38,.55],[.20,.64],[.65,.60],[.80,.22],[.10,.48]];
  const vx=W*.60,vy=H*.68;
  const grid=Array.from({length:4},(_,i)=>`<line x1="${W*(i+1)/5}" y1="0" x2="${W*(i+1)/5}" y2="${H}" stroke="#c5d5e8" stroke-width=".5"/><line x1="0" y1="${H*(i+1)/5}" x2="${W}" y2="${H*(i+1)/5}" stroke="#c5d5e8" stroke-width=".5"/>`).join("");
  const blks=[[.06,.10,.14,.11],[.24,.08,.16,.13],[.44,.06,.18,.12],[.64,.05,.20,.13],[.06,.26,.12,.14],[.22,.24,.14,.13],[.50,.22,.14,.12],[.70,.18,.16,.13],[.06,.46,.10,.13],[.20,.44,.12,.14],[.52,.42,.12,.11],[.72,.40,.14,.12],[.06,.64,.12,.13],[.22,.62,.14,.12],[.44,.60,.10,.10],[.74,.62,.12,.12]].map(([x,y,w,h])=>`<rect x="${W*x}" y="${H*y}" width="${W*w}" height="${H*h}" rx="3" fill="#d4e2f0" opacity=".55"/>`).join("");
  const roads=[[`M${W*.05},${H*.38}Q${W*.28},${H*.30}${W*.50},${H*.34}T${W*.95},${H*.26}`],[`M0,${H*.58}Q${W*.22},${H*.53}${W*.48},${H*.50}T${W*.96},${H*.46}`],[`M${W*.32},0Q${W*.36},${H*.28}${W*.39},${H*.52}T${W*.42},${H}`],[`M${W*.60},0Q${W*.63},${H*.30}${W*.66},${H*.60}T${W*.68},${H}`]].map(([d])=>`<path d="${d}" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".75"/>`).join("");
  const ext=[[.12,.16],[.38,.12],[.82,.24],[.88,.48],[.80,.68],[.12,.74],[.28,.80],[.56,.78],[.90,.70]].map(([x,y])=>`<circle cx="${W*x}" cy="${H*y}" r="6" fill="#b0c4d8" opacity=".4"/>`).join("");
  const lines=concs.slice(0,8).map((_,i)=>{const[cx,cy]=pts[i];return`<line x1="${W*cx}" y1="${H*cy}" x2="${vx}" y2="${vy}" stroke="${cor1}" stroke-width="1" stroke-dasharray="4,3" opacity=".2"/>`;}).join("");
  const dots=concs.slice(0,8).map((c,i)=>{const[cx,cy]=pts[i];const pulse=i===0?`<circle cx="${W*cx}" cy="${H*cy}" r="14" fill="#DC2626" opacity=".1"><animate attributeName="r" values="14;22;14" dur="2.4s" repeatCount="indefinite"/><animate attributeName="opacity" values=".1;.03;.1" dur="2.4s" repeatCount="indefinite"/></circle>`:"";return`${pulse}<circle cx="${W*cx}" cy="${H*cy}" r="14" fill="#DC2626" opacity=".9"/><text x="${W*cx}" y="${H*cy+1}" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="800" fill="#fff" font-family="Manrope,sans-serif">${c.posicao||i+1}</text>`;}).join("");
  const you=`<circle cx="${vx}" cy="${vy}" r="22" fill="${cor1}" opacity=".12"><animate attributeName="r" values="18;28;18" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values=".12;.04;.12" dur="3s" repeatCount="indefinite"/></circle><circle cx="${vx}" cy="${vy}" r="16" fill="${cor1}" opacity=".95"/><circle cx="${vx}" cy="${vy}" r="6" fill="#fff"/><text x="${vx}" y="${vy+27}" text-anchor="middle" font-size="9" fill="${cor1}" font-weight="700" font-family="Manrope,sans-serif">${nome.length>18?nome.slice(0,17)+"…":nome}</text>`;
  const info=`<rect x="8" y="${H-40}" width="205" height="30" rx="6" fill="rgba(255,255,255,.92)"/><text x="14" y="${H-25}" font-size="9" fill="${T.n600}" font-family="Manrope,sans-serif">${cidade} · ${concs.length} negócios mapeados</text><text x="14" y="${H-12}" font-size="8" fill="${T.n400}" font-family="Manrope,sans-serif">Você aparece na posição ${concs.length+1} ou além</text>`;
  return`<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="bg" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#eef4fc"/><stop offset="100%" stop-color="#dce8f5"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#bg)"/>${grid}${blks}${roads}<text x="${W/2}" y="16" text-anchor="middle" font-size="11" fill="#8aa0bc" font-weight="500" font-family="Manrope,sans-serif">${cidade}</text>${ext}<circle cx="${vx}" cy="${vy}" r="55" fill="${cor1}" opacity=".04"/>${lines}${dots}${you}${info}</svg>`;
}
function makeMapStatic({concs=[],cidade="Cidade",nome="Negócio",cor1=T.gold}) {
  const W=560,H=230;
  const pts=[[.14,.26],[.48,.16],[.72,.32],[.34,.54],[.18,.62],[.62,.58],[.80,.20],[.08,.46]];
  const vx=W*.58,vy=H*.68;
  const grid=Array.from({length:4},(_,i)=>`<line x1="${W*(i+1)/5}" y1="0" x2="${W*(i+1)/5}" y2="${H}" stroke="#c5d5e8" stroke-width=".4"/><line x1="0" y1="${H*(i+1)/5}" x2="${W}" y2="${H*(i+1)/5}" stroke="#c5d5e8" stroke-width=".4"/>`).join("");
  const blks=[[.06,.08,.13,.11],[.23,.06,.15,.12],[.42,.05,.17,.11],[.62,.04,.18,.12],[.06,.24,.11,.13],[.21,.22,.13,.12],[.48,.20,.13,.11],[.68,.17,.15,.12],[.06,.44,.10,.12],[.19,.42,.12,.13],[.50,.40,.11,.11],[.70,.38,.13,.11],[.06,.62,.11,.12],[.21,.60,.13,.11],[.42,.58,.10,.10],[.72,.60,.12,.11]].map(([x,y,w,h])=>`<rect x="${W*x}" y="${H*y}" width="${W*w}" height="${H*h}" rx="2" fill="#d4e2f0" opacity=".5"/>`).join("");
  const roads=[[`M${W*.04},${H*.36}Q${W*.26},${H*.28}${W*.48},${H*.32}T${W*.96},${H*.24}`],[`M0,${H*.56}Q${W*.20},${H*.51}${W*.46},${H*.48}T${W*.97},${H*.44}`],[`M${W*.30},0Q${W*.34},${H*.26}${W*.37},${H*.50}T${W*.40},${H}`],[`M${W*.58},0Q${W*.61},${H*.28}${W*.64},${H*.58}T${W*.67},${H}`]].map(([d])=>`<path d="${d}" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/>`).join("");
  const ext=[[.10,.15],[.36,.11],[.84,.22],[.90,.46],[.82,.66],[.10,.72],[.26,.78],[.54,.76]].map(([x,y])=>`<circle cx="${W*x}" cy="${H*y}" r="5" fill="#b0c4d8" opacity=".38"/>`).join("");
  const lines=concs.slice(0,8).map((_,i)=>{const[cx,cy]=pts[i];return`<line x1="${W*cx}" y1="${H*cy}" x2="${vx}" y2="${vy}" stroke="${cor1}" stroke-width="1" stroke-dasharray="3,3" opacity=".18"/>`;}).join("");
  const dots=concs.slice(0,8).map((c,i)=>{const[cx,cy]=pts[i];return`<circle cx="${W*cx}" cy="${H*cy}" r="13" fill="#DC2626" opacity=".88"/><text x="${W*cx}" y="${H*cy+1}" text-anchor="middle" dominant-baseline="middle" font-size="9" font-weight="800" fill="#fff" font-family="Manrope,sans-serif">${c.posicao||i+1}</text>`;}).join("");
  const you=`<circle cx="${vx}" cy="${vy}" r="14" fill="${cor1}" opacity=".92"/><circle cx="${vx}" cy="${vy}" r="5" fill="#fff"/><text x="${vx}" y="${vy+24}" text-anchor="middle" font-size="8" fill="${cor1}" font-weight="700" font-family="Manrope,sans-serif">${nome.length>20?nome.slice(0,19)+"…":nome}</text>`;
  const info=`<rect x="6" y="${H-30}" width="190" height="24" rx="5" fill="rgba(255,255,255,.92)"/><text x="11" y="${H-19}" font-size="8" fill="${T.n600}" font-family="Manrope,sans-serif">${cidade} · ${concs.length} negócios mapeados</text><text x="11" y="${H-8}" font-size="7.5" fill="${T.n400}" font-family="Manrope,sans-serif">Posicionamento identificado</text>`;
  return`<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="bg2" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#eef4fc"/><stop offset="100%" stop-color="#dce8f5"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#bg2)"/>${grid}${blks}${roads}<text x="${W/2}" y="13" text-anchor="middle" font-size="10" fill="#8aa0bc" font-weight="500" font-family="Manrope,sans-serif">${cidade}</text>${ext}<circle cx="${vx}" cy="${vy}" r="42" fill="${cor1}" opacity=".04"/>${lines}${dots}${you}${info}</svg>`;
}

/* ─── ESTILOS ────────────────────────────────────────────── */
const css = {
  card: bg => ({background:bg||T.n0,border:`.5px solid ${T.n200}`,borderRadius:"14px",padding:"20px",marginBottom:"14px"}),
  inp: {width:"100%",padding:"9px 12px",border:`.5px solid ${T.n200}`,borderRadius:"8px",fontSize:"13px",color:T.n900,background:T.n0,outline:"none",boxSizing:"border-box",fontFamily:"'Manrope',sans-serif"},
  lbl: {display:"block",fontSize:"10px",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:T.n400,marginBottom:"5px"},
  sec: {fontSize:"10px",fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:T.n400,margin:"18px 0 10px",paddingBottom:"6px",borderBottom:`.5px solid ${T.n200}`},
  btn: (bg,col) => ({display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"7px",padding:"9px 18px",borderRadius:"8px",fontFamily:"'Manrope',sans-serif",fontSize:"13px",fontWeight:700,cursor:"pointer",border:"none",background:bg,color:col}),
  btnSm: (bg,col,border) => ({display:"inline-flex",alignItems:"center",gap:"6px",padding:"6px 13px",borderRadius:"7px",fontFamily:"'Manrope',sans-serif",fontSize:"12px",fontWeight:600,cursor:"pointer",border:border||`.5px solid ${T.n300}`,background:bg,color:col}),
  badge: (bg,col) => ({display:"inline-flex",alignItems:"center",gap:"4px",padding:"2px 9px",borderRadius:"20px",fontSize:"10px",fontWeight:700,background:bg,color:col}),
  sbar: {display:"flex",alignItems:"center",gap:"10px",marginBottom:"7px"},
};

/* ─── Paste Image ───────────────────────────────────────── */
function PasteImage({value, onChange, label="Cole um print (Ctrl+V)", hint=""}) {
  const [drag, setDrag] = useState(false);
  const fileRef = useRef();
  useEffect(()=>{
    const h = e => {
      const items = e.clipboardData?.items;
      if(!items) return;
      for(const item of items){
        if(item.type.startsWith("image/")){
          const r = new FileReader();
          r.onload = ev => onChange(ev.target.result);
          r.readAsDataURL(item.getAsFile());
          e.preventDefault(); break;
        }
      }
    };
    document.addEventListener("paste",h);
    return ()=>document.removeEventListener("paste",h);
  },[onChange]);
  const load = f => { if(!f||!f.type.startsWith("image/"))return; const r=new FileReader(); r.onload=ev=>onChange(ev.target.result); r.readAsDataURL(f); };
  return(
    <div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);load(e.dataTransfer.files[0]);}} onClick={()=>fileRef.current?.click()} style={{border:`1.5px dashed ${drag?"#7C3AED":"#CEC9DC"}`,borderRadius:"10px",padding:"14px",textAlign:"center",cursor:"pointer",background:drag?"#F3EEFF":"#FAFAF9",transition:"all .15s",minHeight:"80px",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>load(e.target.files[0])}/>
      {value
        ?<div style={{width:"100%"}}><img src={value} style={{maxHeight:"180px",maxWidth:"100%",objectFit:"contain",borderRadius:"8px",display:"block",margin:"0 auto"}}/><button onClick={e=>{e.stopPropagation();onChange("");}} style={{marginTop:"8px",background:"none",border:"none",cursor:"pointer",color:"#9991AF",fontSize:"12px"}}>Remover</button></div>
        :<div><div style={{fontSize:"20px",marginBottom:"5px",color:"#CEC9DC"}}>⌘</div><div style={{fontSize:"13px",fontWeight:600,color:"#5C5575"}}>{label}</div>{hint&&<div style={{fontSize:"11px",color:"#9991AF",marginTop:"3px"}}>{hint}</div>}<div style={{fontSize:"11px",color:"#9991AF",marginTop:"4px"}}>ou arraste · ou clique</div></div>
      }
    </div>
  );
}


const LogoIcon = ({size=40}) => (
  <img src={LOGO_B64} alt="SCentral" style={{height:`${size}px`,width:"auto",objectFit:"contain",display:"block",margin:"0 auto",mixBlendMode:"lighten"}}/>
);

/* ─── APP ────────────────────────────────────────────────── */
export default function App() {
  const [pg, setPg] = useState(1);
  const [nichoKey, setNichoKey] = useState("outro");
  const [form, setForm] = useState({
    nome:"",categoria:"",especializacao:"",responsavel:"",
    cidade:"",estado:"",endereco:"",site:"",whatsapp:"",
    temSite:false,temWhats:false,postsAtivos:false,frequencia:"nenhuma",
    nota:"",numAvals:"",numFotos:"",posicao:"",score:"",
    cor1:T.gold,cor2:T.dark,
    cslNome:"",cslEmpresa:"",cslWhats:"",cslInsta:"",promptExtra:"",
    nichoKey:"outro",tom:"original",fichaUrl:"",
  });
  const [ig, setIg] = useState({
    url:"",handle:"",seguidores:"",bioOtimizada:false,linkBio:false,
    frequencia:"nenhuma",qualVisual:"media",contAutoridade:"parcial",
    engRate:"",printUrl:"",score:"0",extraido:false,
  });
  const [kws, setKws] = useState([]);
  const [kwInput, setKwInput] = useState("");
  const [concs, setConcs] = useState([]);
  const [logoUrl, setLogoUrl] = useState("");
  const [textos, setTextos] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [concLoad, setConcLoad] = useState(false);
  const [fichaLoad, setFichaLoad] = useState(false);
  const [p2modo, setP2modo] = useState("manual");
  const [igLoad, setIgLoad] = useState(false);
  const [presets, setPresets] = useState(loadPresets());
  const [presetName, setPresetName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const logoRef = useRef();

  const setF = (k,v) => {
    const next = {...form,[k]:v,nichoKey};
    const autoF=["nota","numAvals","numFotos","temSite","temWhats","postsAtivos","frequencia"];
    if(autoF.includes(k) && (next.nota||next.numAvals||next.numFotos)) {
      next.score = String(calcScore(next));
    }
    setForm(next);
  };
  const setIG = (k,v) => {
    const next = {...ig,[k]:v};
    next.score = String(calcIgScore(next));
    setIg(next);
  };
  useEffect(()=>{ setForm(f=>({...f,nichoKey})); },[nichoKey]);

  // Verifica se seção tem dados para gerar no PDF
  const temDadosGoogle = !!(form.nota||form.numAvals||form.posicao||form.score);
  const temConcs = concs.length > 0;
  const temIG = !!(ig.handle||ig.url||ig.printUrl);

  const setNicho = key => { setNichoKey(key); setF("categoria",NICHOS[key].label); };
  const txAtual = () => textos || textosPadrao({...form,nichoKey}, concs);
  const setTx = (k,v) => setTextos(t=>({...(t||textosPadrao({...form,nichoKey},concs)),[k]:v}));

  const loadLogo = e => { const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=ev=>setLogoUrl(ev.target.result); r.readAsDataURL(f); };

  const salvarPreset = () => {
    if(!presetName.trim()) return;
    const p = {id:Date.now(),name:presetName.trim(),cor1:form.cor1,cor2:form.cor2,cslNome:form.cslNome,cslEmpresa:form.cslEmpresa,cslWhats:form.cslWhats,cslInsta:form.cslInsta,tom:form.tom,logoUrl};
    const updated = [...presets,p]; setPresets(updated); savePresets(updated);
    setPresetName(""); setShowSave(false);
    setStatus({t:"ok",m:`Preset "${p.name}" salvo!`});
  };
  const aplicarPreset = p => {
    setForm(f=>({...f,cor1:p.cor1,cor2:p.cor2,cslNome:p.cslNome,cslEmpresa:p.cslEmpresa,cslWhats:p.cslWhats,cslInsta:p.cslInsta,tom:p.tom}));
    if(p.logoUrl) setLogoUrl(p.logoUrl);
    setStatus({t:"ok",m:`Preset "${p.name}" aplicado!`});
  };

  const extrairFicha = async () => {
    const url=form.fichaUrl.trim(); if(!url){setStatus({t:"err",m:"Cole o link da ficha Google."});return;}
    setFichaLoad(true); setStatus({t:"load",m:"Analisando ficha Google..."});
    try {
      const resp=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:900,messages:[{role:"user",content:`Acesse a ficha Google Meu Negócio em: ${url}\nSe não conseguir diretamente, busque pelo nome na URL.\nRetorne SOMENTE JSON sem markdown:\n{"nome":"","categoria":"","endereco":"","cidade":"","estado":"","nota":"","numAvals":"","numFotos":"","temSite":false,"temWhats":false,"postsAtivos":false,"frequencia":"nenhuma","site":"","whatsapp":"","posicao":"","social":""}`}]})});
      const data=await resp.json();
      const text=data.content?.filter(b=>b.type==="text").map(b=>b.text).join("")||"";
      const s=text.indexOf("{"),e=text.lastIndexOf("}"); if(s<0)throw new Error();
      const p=JSON.parse(text.slice(s,e+1));
      const next={...form,nichoKey};
      ["nome","categoria","endereco","cidade","estado","nota","numAvals","numFotos","site","whatsapp","posicao","social"].forEach(k=>{if(p[k]!=null&&String(p[k]).trim())next[k]=String(p[k]);});
      if(typeof p.temSite==="boolean")next.temSite=p.temSite;
      if(typeof p.temWhats==="boolean")next.temWhats=p.temWhats;
      if(typeof p.postsAtivos==="boolean")next.postsAtivos=p.postsAtivos;
      if(p.frequencia)next.frequencia=p.frequencia;
      if(next.nota||next.numAvals)next.score=String(calcScore(next));
      setForm(next);
      if(p.categoria){const k=Object.entries(NICHOS).find(([,v])=>p.categoria.toLowerCase().includes(v.label.toLowerCase().split(" ")[0].toLowerCase()));if(k)setNichoKey(k[0]);}
      setStatus({t:"ok",m:"Dados extraídos! Confira e edite se necessário."});
    } catch { setStatus({t:"err",m:"Não foi possível extrair. Preencha manualmente."}); }
    setFichaLoad(false);
  };

  const extrairIG = async () => {
    const url=ig.url.trim(); if(!url){setStatus({t:"err",m:"Cole o link do Instagram."});return;}
    setIgLoad(true); setStatus({t:"load",m:"Analisando perfil do Instagram..."});
    try {
      const resp=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:900,messages:[{role:"user",content:`Acesse o perfil do Instagram neste link e analise: ${url}\nRetorne SOMENTE JSON sem markdown:\n{"handle":"username sem @","seguidores":"número","bioOtimizada":false,"linkBio":false,"frequencia":"nenhuma ou raramente ou mensal ou semanal ou diaria","qualVisual":"ruim ou media ou boa","contAutoridade":"nenhum ou parcial ou completo","engRate":"porcentagem numérica","observacoes":"observação breve sobre o perfil"}`}]})});
      const data=await resp.json();
      const text=data.content?.filter(b=>b.type==="text").map(b=>b.text).join("")||"";
      const s=text.indexOf("{"),e=text.lastIndexOf("}"); if(s<0)throw new Error();
      const p=JSON.parse(text.slice(s,e+1));
      const next={...ig,url,extraido:true};
      if(p.handle)next.handle=p.handle;
      if(p.seguidores)next.seguidores=String(p.seguidores);
      if(typeof p.bioOtimizada==="boolean")next.bioOtimizada=p.bioOtimizada;
      if(typeof p.linkBio==="boolean")next.linkBio=p.linkBio;
      if(p.frequencia)next.frequencia=p.frequencia;
      if(p.qualVisual)next.qualVisual=p.qualVisual;
      if(p.contAutoridade)next.contAutoridade=p.contAutoridade;
      if(p.engRate)next.engRate=String(p.engRate);
      next.score=String(calcIgScore(next));
      setIg(next);
      setStatus({t:"ok",m:"Perfil analisado! Confira e ajuste se necessário."});
    } catch { setStatus({t:"err",m:"Não foi possível analisar. Preencha manualmente."}); }
    setIgLoad(false);
  };

  const buscarConcs = async () => {
    if(!form.categoria||!form.cidade){setStatus({t:"err",m:"Preencha categoria e cidade."});return;}
    setConcLoad(true); setStatus({t:"load",m:"Buscando concorrentes..."});
    try {
      const resp=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1200,messages:[{role:"user",content:`Pesquise no Google Maps os TOP 5 concorrentes do segmento "${form.categoria}${form.especializacao?" - "+form.especializacao:""}" em ${form.cidade}, Brasil. Liste os negócios reais que aparecem nessa busca. Retorne SOMENTE JSON sem markdown: {"concorrentes":[{"posicao":1,"nome":"Nome completo","nota":"4.5","avals":"300","diferencial":"principal diferencial em 1 frase"}]}`}]})});
      const data=await resp.json();
      const text=data.content?.filter(b=>b.type==="text").map(b=>b.text).join("")||"";
      const s=text.indexOf("{"),e=text.lastIndexOf("}");
      const parsed=JSON.parse(text.slice(s,e+1));
      setConcs([...(parsed.concorrentes||[]).map(c=>({...c,manual:false})),...concs.filter(c=>c.manual)]);
      setStatus({t:"ok",m:`${parsed.concorrentes?.length||0} concorrentes encontrados!`});
    } catch { setStatus({t:"err",m:"Erro. Adicione manualmente."}); }
    setConcLoad(false);
  };

  const addComp = () => {
    const nome=document.getElementById("cNome")?.value?.trim(); if(!nome)return;
    setConcs(p=>[...p,{nome,nota:document.getElementById("cNota")?.value||"?",avals:document.getElementById("cAvals")?.value||"?",posicao:document.getElementById("cPos")?.value||"?",diferencial:document.getElementById("cDiff")?.value||"",manual:true}]);
    ["cNome","cNota","cAvals","cPos","cDiff"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="";});
  };

  const gerarTextoIA = async () => {
    if(!form.nome||!form.categoria){setStatus({t:"err",m:"Preencha nome e categoria."});return;}
    setLoading(true); setStatus({t:"load",m:`Gerando — tom ${TONS[form.tom]?.label}...`});
    const n=NICHOS[nichoKey]||NICHOS.outro;
    const ton=TONS[form.tom]||TONS.original;
    try {
      const resp=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1800,messages:[{role:"user",content:`Copywriter de marketing digital local.

TOM: ${ton.label}
INSTRUÇÃO: ${ton.instrucao}

NEGÓCIO: ${form.nome} | SEGMENTO: ${form.categoria} | CIDADE: ${form.cidade} ${form.estado}
CLIENTE: ${n.cliente} | POSITIVO JÁ EXISTENTE: ${n.positivo}
${temDadosGoogle?`NOTA GOOGLE: ${form.nota}★ (${form.numAvals} avals) | SCORE: ${form.score}/100 | POSIÇÃO: #${form.posicao}`:"SEM DADOS GOOGLE DISPONÍVEIS"}
${temConcs?`CONCORRENTES: ${concs.length} mapeados`:"SEM ANÁLISE DE CONCORRENTES"}
${temIG?`IG HANDLE: @${ig.handle} | SEGUIDORES: ${ig.seguidores} | IG SCORE: ${ig.score}/100`:"SEM ANÁLISE DE INSTAGRAM"}
CONSULTOR: ${form.cslNome} da ${form.cslEmpresa}
${form.promptExtra?"INSTRUÇÃO EXTRA: "+form.promptExtra:""}

Gere SOMENTE as seções que têm dados disponíveis. Use <strong> para negrito.
Retorne SOMENTE JSON sem markdown:
{"tituloIntro":"máx 6 palavras","tituloAnalise":"máx 6 palavras","tituloConc":"máx 6 palavras","tituloIg":"máx 6 palavras","tituloProx":"máx 6 palavras","intro":"3-4 frases","problema":"3-4 frases","dados":"2-3 frases","diferenciais":"2-3 frases","igAnalise":"3-4 frases","proximos":"3-4 frases"}`}]})});
      const data=await resp.json();
      const text=data.content?.filter(b=>b.type==="text").map(b=>b.text).join("")||"";
      const s=text.indexOf("{"),e=text.lastIndexOf("}");
      setTextos(JSON.parse(text.slice(s,e+1)));
      setStatus({t:"ok",m:"Textos gerados! Revise na etapa 8."});
    } catch { setStatus({t:"err",m:"Erro. Tente novamente."}); }
    setLoading(false);
  };

  const abrirPDF = () => {
    if(!form.nome||!form.categoria){setStatus({t:"err",m:"Preencha nome e categoria."});return;}
    const html=buildPDF({form,ig,kws,concs,logoUrl,textos:txAtual(),temDadosGoogle,temConcs,temIG});
    const win=window.open("","_blank");
    if(!win){setStatus({t:"err",m:"Popup bloqueado!"});return;}
    win.document.write(html); win.document.close();
    setTimeout(()=>{win.focus();win.print();},1600);
    setStatus({t:"ok",m:"Aberto! Ctrl+P → Salvar como PDF."});
  };

  /* helpers UI */
  const SBar=()=>{if(!status)return null;const C={err:{bg:T.errBg,col:T.err},ok:{bg:T.okBg,col:T.ok},load:{bg:T.warnBg,col:T.warn}};return<div style={{padding:"9px 13px",borderRadius:"8px",fontSize:"12px",marginBottom:"12px",background:C[status.t]?.bg||"#EFF6FF",color:C[status.t]?.col||"#1D4ED8"}}>{status.m}</div>;};
  const Tog=({checked,onChange,label})=>(<div style={{display:"flex",alignItems:"center",gap:"10px",padding:"5px 0"}}><label style={{position:"relative",width:"34px",height:"18px",flexShrink:0}}><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} style={{opacity:0,width:0,height:0}}/><span style={{position:"absolute",inset:0,background:checked?form.cor1:T.n300,borderRadius:"9px",cursor:"pointer",transition:".2s"}}><span style={{position:"absolute",width:"12px",height:"12px",left:checked?"19px":"3px",top:"3px",background:"#fff",borderRadius:"50%",transition:".2s"}}/></span></label><span style={{fontSize:"13px",color:T.n700}}>{label}</span></div>);
  const Nav=({label,to,back})=>(<button onClick={()=>setPg(to)} style={{...css.btn(back?T.n0:T.dark,back?T.n700:"#fff"),border:back?`.5px solid ${T.n300}`:"none"}}>{label}</button>);

  const scoreCrit=[
    {l:"Nota Google",pts:Math.round(Math.min((parseFloat(form.nota)||0)/5*25,25)),max:25},
    {l:"Nº avaliações",pts:Math.round(Math.min((parseInt(form.numAvals)||0)/200*20,20)),max:20},
    {l:"Fotos Google",pts:Math.round(Math.min((parseInt(form.numFotos)||0)/20*15,15)),max:15},
    {l:"Site ativo",pts:form.temSite?10:0,max:10},
    {l:"WhatsApp na ficha",pts:form.temWhats?10:0,max:10},
    {l:"Posts ativos",pts:form.postsAtivos?10:0,max:10},
    {l:"Frequência posts",pts:{nenhuma:0,raramente:3,mensal:5,semanal:8,diaria:10}[form.frequencia]||0,max:10},
  ];
  const igCrit=[
    {l:"Bio otimizada",pts:ig.bioOtimizada?15:0,max:15},
    {l:"Frequência posts",pts:{nenhuma:0,raramente:5,mensal:8,semanal:14,diaria:20}[ig.frequencia]||0,max:20},
    {l:"Qualidade visual",pts:{ruim:0,media:8,boa:15}[ig.qualVisual]||0,max:15},
    {l:"Conteúdo autoridade",pts:{nenhum:0,parcial:12,completo:20}[ig.contAutoridade]||0,max:20},
    {l:"Engajamento",pts:Math.round(Math.min((parseFloat(ig.engRate)||0)/3*25,25)),max:25},
    {l:"Link na bio",pts:ig.linkBio?5:0,max:5},
  ];

  const mapHtml=makeMapSVG({concs,cidade:form.cidade||"Cidade",nome:form.nome||"Negócio",cor1:form.cor1});
  const tx=txAtual();
  const tonAtual=TONS[form.tom]||TONS.original;

  const TxField=({label,campo,multi=true})=>{const val=tx[campo]||"";return(<div style={{marginBottom:"14px"}}><label style={css.lbl}>{label}</label>{multi?<textarea style={{...css.inp,minHeight:"72px",resize:"vertical"}} value={val} onChange={e=>setTx(campo,e.target.value)}/>:<input style={css.inp} value={val} onChange={e=>setTx(campo,e.target.value)}/>}{val.includes("<strong>")&&<div style={{marginTop:"5px",padding:"7px 11px",background:T.n50,borderRadius:"6px",border:`.5px solid ${T.n200}`,fontSize:"12px",color:T.n600,lineHeight:1.5}} dangerouslySetInnerHTML={{__html:val}}/>}</div>);};

  return(
    <div style={{display:"grid",gridTemplateColumns:"210px 1fr",minHeight:"700px"}}>

      {/* SIDEBAR / TOP NAV */}
      <div style={{background:"#0D0B12",borderRadius:"14px 0 0 14px",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"18px 16px 14px",borderBottom:"1px solid #1a1628"}}>
          <div style={{marginBottom:"12px",padding:"12px 8px 8px"}}>
            {logoUrl
              ?<img src={logoUrl} style={{maxHeight:"72px",maxWidth:"190px",objectFit:"contain",display:"block",margin:"0 auto"}}/>
              :<LogoIcon size={110}/>
            }
          </div>
          {form.cslEmpresa&&<div style={{fontSize:"11px",fontWeight:600,color:"#888",marginBottom:"4px"}}>{form.cslEmpresa}</div>}
          <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
            <div style={{padding:"4px 10px",background:form.cor1+"22",borderRadius:"6px",fontSize:"10px",color:form.cor1,fontWeight:700,letterSpacing:".06em",display:"inline-block"}}>{tonAtual.label}</div>
            <div style={{display:"flex",background:"#111",borderRadius:"8px",overflow:"hidden",border:`1px solid ${form.cor1}44`,width:"100%"}}>
              <button onClick={()=>setP2modo("manual")} style={{flex:1,padding:"7px 6px",fontSize:"10px",fontWeight:700,cursor:"pointer",border:"none",background:p2modo==="manual"?form.cor1:"transparent",color:p2modo==="manual"?"#fff":"#555",letterSpacing:".05em",transition:"all .15s"}}>MANUAL</button>
              <div style={{width:"1px",background:form.cor1+"33"}}/>
              <button onClick={()=>setP2modo("auto")} style={{flex:1,padding:"7px 6px",fontSize:"10px",fontWeight:700,cursor:"pointer",border:"none",background:p2modo==="auto"?form.cor1:"transparent",color:p2modo==="auto"?"#fff":"#555",letterSpacing:".05em",transition:"all .15s",display:"flex",alignItems:"center",justifyContent:"center",gap:"4px"}}>
                <span style={{width:"6px",height:"6px",borderRadius:"50%",background:p2modo==="auto"?"#fff":form.cor1,display:"inline-block"}}/>AUTO IA
              </button>
            </div>
          </div>
        </div>
        <nav style={{flex:1,padding:"8px 0"}}>
          {[{n:1,g:"Negócio",l:"Segmento & Dados"},{n:2,g:"Negócio",l:"Métricas Google"},{n:3,g:"Negócio",l:"Palavras-chave"},{n:4,g:"Análise",l:"Concorrentes"},{n:5,g:"Análise",l:"Instagram"},{n:6,g:"Design",l:"Cores & Logo"},{n:7,g:"Design",l:"Consultor"},{n:8,g:"Saída",l:"Editar & PDF"}].map(({n,l,g},i,arr)=>{
            const showG=i===0||arr[i-1].g!==g;
            const opcional = (n===2&&!temDadosGoogle&&form.nota==="")||(n===4&&!temConcs)||(n===5&&!temIG);
            return(<div key={n}>
              {showG&&<div style={{fontSize:"9px",color:"#2e2a3e",padding:"8px 16px 2px",textTransform:"uppercase",letterSpacing:".1em",fontWeight:700}}>{g}</div>}
              <div onClick={()=>setPg(n)} style={{display:"flex",alignItems:"center",gap:"9px",padding:"9px 16px",cursor:"pointer",color:pg===n?"#fff":"#555",background:pg===n?"#1C1730":"transparent",borderLeft:`3px solid ${pg===n?form.cor1:"transparent"}`,fontSize:"12px",fontWeight:pg===n?600:400,transition:"all .12s"}}>
                <span style={{fontSize:"11px",width:"18px",textAlign:"center",fontWeight:700,color:pg===n?form.cor1:"#333"}}>{n}</span>
                <span style={{flex:1}}>{l}</span>
                {opcional&&<span style={{fontSize:"9px",color:"#333",fontStyle:"italic"}}>opt.</span>}
              </div>
            </div>);
          })}
        </nav>
        <div style={{padding:"14px 16px",borderTop:"1px solid #1a1628"}}>
          <button onClick={()=>setPg(8)} style={{...css.btn(form.cor1,"#fff"),width:"100%",fontSize:"13px"}}>Editar & PDF</button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{padding:"22px",background:T.n100,borderRadius:"0 14px 14px 0",overflowY:"auto",maxHeight:"760px"}}>

        {/* P1 — Segmento & Dados */}
        {pg===1&&<div>
          {presets.length>0&&(
            <div style={css.card()}>
              <div style={css.sec}>Configurações salvas</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"8px"}}>
                {presets.map(p=>(
                  <div key={p.id} style={{display:"flex",alignItems:"center",gap:"6px",padding:"6px 12px",background:T.n50,border:`.5px solid ${T.n200}`,borderRadius:"8px"}}>
                    <div style={{width:"10px",height:"10px",borderRadius:"50%",background:p.cor1}}/>
                    <span style={{fontSize:"12px",fontWeight:600,color:T.n700}}>{p.name}</span>
                    <button onClick={()=>aplicarPreset(p)} style={css.btnSm(T.goldL,T.gold,`.5px solid ${T.goldM}`)}>Aplicar</button>
                    <button onClick={()=>{const u=presets.filter(x=>x.id!==p.id);setPresets(u);savePresets(u);}} style={{background:"none",border:"none",cursor:"pointer",color:T.n400,fontSize:"15px",lineHeight:1}}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{padding:"10px 14px",marginBottom:"12px",background:p2modo==="auto"?"#FDF6E3":"#F5F4F8",border:"0.5px solid #E8E6EE",borderRadius:"10px",display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{width:"8px",height:"8px",borderRadius:"50%",background:p2modo==="auto"?"#C9A84C":form.cor1,flexShrink:0}}/>
            <div style={{fontSize:"12px",color:"#5C5575"}}>
              {p2modo==="manual"
                ?<span>Modo <strong style={{color:"#111020"}}>Manual</strong> — preencha todos os dados do negócio nas etapas abaixo.</span>
                :<span>Modo <strong style={{color:"#C9A84C"}}>Auto IA</strong> — cole o link do Google Maps na etapa 2 para extração automática.</span>
              }
            </div>
          </div>

          <div style={{padding:"10px 14px",marginBottom:"12px",background:p2modo==="auto"?"#FDF6E3":"#F5F4F8",border:"0.5px solid #E8E6EE",borderRadius:"10px",display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{width:"8px",height:"8px",borderRadius:"50%",background:p2modo==="auto"?"#C9A84C":form.cor1,flexShrink:0}}/>
            <div style={{fontSize:"12px",color:"#5C5575"}}>{p2modo==="manual"?<span>Modo <strong style={{color:"#111020"}}>Manual</strong> — preencha os dados nas etapas abaixo.</span>:<span>Modo <strong style={{color:"#C9A84C"}}>Auto IA</strong> — cole o link do Google Maps na etapa 2.</span>}</div>
          </div>
          <div style={css.card()}>
            <div style={css.sec}>Tom de comunicação</div>
            {Object.entries(TONS).map(([k,v])=>(
              <div key={k} onClick={()=>setF("tom",k)} style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px 14px",borderRadius:"10px",border:form.tom===k?`1.5px solid ${form.cor1}`:`.5px solid ${T.n200}`,background:form.tom===k?form.cor1+"0d":T.n0,cursor:"pointer",marginBottom:"7px",transition:"all .12s"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:"13px",fontWeight:700,color:form.tom===k?form.cor1:T.n900}}>{v.label}</div>
                  <div style={{fontSize:"11px",color:T.n400,marginTop:"2px"}}>{v.desc}</div>
                </div>
                {form.tom===k&&<div style={{width:"8px",height:"8px",borderRadius:"50%",background:form.cor1,flexShrink:0}}/>}
              </div>
            ))}
          </div>

          {(form.nome||form.cidade||form.categoria)&&(
            <div style={{...css.card(),background:T.goldL,border:`.5px solid ${T.goldM}`}}>
              <div style={{fontSize:"10px",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:T.gold,marginBottom:"10px",display:"flex",alignItems:"center",gap:"6px"}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                Dados extraídos pela IA
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"8px"}}>
                <div><label style={css.lbl}>Nome</label><input style={css.inp} value={form.nome} onChange={e=>setF("nome",e.target.value)}/></div>
                <div><label style={css.lbl}>Categoria</label><input style={css.inp} value={form.categoria} onChange={e=>setF("categoria",e.target.value)}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 80px",gap:"10px",marginBottom:"8px"}}>
                <div><label style={css.lbl}>Cidade</label><input style={css.inp} value={form.cidade} onChange={e=>setF("cidade",e.target.value)}/></div>
                <div><label style={css.lbl}>UF</label><input style={css.inp} value={form.estado} onChange={e=>setF("estado",e.target.value)}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                <div><label style={css.lbl}>Nota Google</label><input style={css.inp} value={form.nota} onChange={e=>setF("nota",e.target.value)}/></div>
                <div><label style={css.lbl}>Nº avaliações</label><input style={css.inp} value={form.numAvals} onChange={e=>setF("numAvals",e.target.value)}/></div>
              </div>
            </div>
          )}
          <div style={{display:"flex",justifyContent:"flex-end"}}><button onClick={()=>setPg(2)} style={css.btn(T.dark,"#fff")}>Próximo</button></div>
        </div>}

        {/* P2 — Métricas Google (OPCIONAL) */}
        {pg===2&&<div>
          {/* Seletor de modo */}
          <div style={{display:"flex",flexDirection:"row",gap:"8px",marginBottom:"14px"}}>
            <button onClick={()=>setP2modo("manual")} style={{...css.btn(p2modo==="manual"?form.cor1:T.n0,p2modo==="manual"?"#fff":T.n600),border:`.5px solid ${p2modo==="manual"?form.cor1:T.n300}`,fontSize:"13px",padding:"9px 20px",flex:1}}>
              Preencher manualmente
            </button>
            <button onClick={()=>setP2modo("auto")} style={{...css.btn(p2modo==="auto"?form.cor1:T.n0,p2modo==="auto"?"#fff":T.n600),border:`.5px solid ${p2modo==="auto"?form.cor1:T.n300}`,fontSize:"13px",padding:"9px 20px",flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:"7px"}}>
              <span style={{background:"linear-gradient(90deg,#7C3AED,#4F46E5)",color:"#fff",fontSize:"10px",padding:"2px 7px",borderRadius:"10px",fontWeight:700}}>IA</span>
              Extrair pelo link
            </button>
          </div>

          {/* Modo automático */}
          {p2modo==="auto"&&(
            <div style={css.card()}>
              <div style={{fontSize:"13px",fontWeight:700,marginBottom:"4px"}}>Link da ficha Google Maps</div>
              <p style={{fontSize:"12px",color:T.n400,marginBottom:"10px"}}>Cole o link do Google Maps. A IA extrai nota, avaliações, fotos e posição automaticamente.</p>
              <div style={{display:"flex",gap:"8px"}}>
                <input style={css.inp} value={form.fichaUrl} onChange={e=>setF("fichaUrl",e.target.value)} placeholder="https://maps.google.com/..."/>
                <button onClick={extrairFicha} disabled={fichaLoad} style={{...css.btn(form.cor1,"#fff"),whiteSpace:"nowrap",opacity:fichaLoad?.7:1,fontSize:"12px",padding:"9px 14px"}}>
                  {fichaLoad?"Analisando...":"Extrair"}
                </button>
              </div>
              <SBar/>
            </div>
          )}
          <div style={{...css.card(T.goldL),border:`.5px solid ${T.goldM}`,marginBottom:"10px"}}>
            <div style={{fontSize:"12px",color:T.gold,fontWeight:600,display:"flex",alignItems:"center",gap:"6px"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Seção opcional — deixe em branco para não incluir no PDF
            </div>
          </div>
          <div style={css.card()}>
            <div style={css.sec}>Avaliação no Google</div>
            <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"14px"}}>
              {[1,2,3,4,5].map(v=>(<span key={v} onClick={()=>setF("nota",String(v))} style={{fontSize:"24px",cursor:"pointer",color:parseFloat(form.nota)>=v?"#fbbc04":T.n200,lineHeight:1}}>★</span>))}
              <input type="number" style={{...css.inp,width:"68px",marginLeft:"8px"}} value={form.nota} min="1" max="5" step="0.1" onChange={e=>setF("nota",e.target.value)} placeholder="0.0"/>
              <span style={{fontSize:"12px",color:T.n400}}>/5.0</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px"}}>
              <div><label style={css.lbl}>Nº avaliações</label><input style={css.inp} type="number" value={form.numAvals} onChange={e=>setF("numAvals",e.target.value)} placeholder="—"/></div>
              <div><label style={css.lbl}>Fotos Google</label><input style={css.inp} type="number" value={form.numFotos} onChange={e=>setF("numFotos",e.target.value)} placeholder="—"/></div>
              <div><label style={css.lbl}>Posição ranking</label><input style={css.inp} type="number" value={form.posicao} onChange={e=>setF("posicao",e.target.value)} placeholder="—"/></div>
            </div>
          </div>
          <div style={css.card()}>
            <label style={css.lbl}>Print da ficha Google <span style={{fontWeight:400,color:"#9991AF",textTransform:"none",letterSpacing:0,fontSize:"11px"}}>(opcional)</span></label>
            <PasteImage value={form.fichaScreenshot||""} onChange={v=>setF("fichaScreenshot",v)} label="Cole o print da ficha aqui (Ctrl+V)" hint="Aparece como referência visual no diagnóstico"/>
          </div>
          {temDadosGoogle&&(
            <div style={css.card()}>
              <div style={css.sec}>Score de presença digital</div>
              <div style={{display:"flex",alignItems:"center",gap:"16px",flexWrap:"wrap"}}>
                <GaugeSVG score={form.score} size={180}/>
                <div style={{flex:1,minWidth:"180px"}}>
                  {scoreCrit.map(({l,pts,max})=>(
                    <div key={l} style={css.sbar}>
                      <div style={{fontSize:"11px",color:T.n600,width:"120px",flexShrink:0}}>{l}</div>
                      <div style={{flex:1,height:"5px",background:T.n100,borderRadius:"3px",overflow:"hidden"}}><div style={{width:`${(pts/max)*100}%`,height:"100%",background:pts===max?"#16A34A":pts>0?form.cor1:T.n200,borderRadius:"3px",transition:".4s"}}/></div>
                      <div style={{fontSize:"11px",fontWeight:700,color:T.n700,minWidth:"34px",textAlign:"right"}}>{pts}/{max}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{marginTop:"12px",display:"flex",alignItems:"center",gap:"10px"}}>
                <span style={{fontSize:"12px",color:T.n400}}>Ajuste manual:</span>
                <input type="range" min="0" max="100" value={form.score||0} onChange={e=>setForm(f=>({...f,score:e.target.value}))} style={{flex:1,accentColor:form.cor1}}/>
                <span style={{fontSize:"16px",fontWeight:800,color:form.cor1,minWidth:"36px"}}>{form.score||0}</span>
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:"10px",justifyContent:"space-between"}}><Nav label="← Voltar" to={1} back/><Nav label="Próximo →" to={3}/></div>
        </div>}

        {/* P3 — Palavras-chave */}
        {pg===3&&<div>
          <div style={css.card()}>
            <div style={css.sec}>Palavras-chave</div>
            <div style={{display:"flex",gap:"8px",marginBottom:"8px"}}>
              <input style={css.inp} value={kwInput} onChange={e=>setKwInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&kwInput.trim()){if(!kws.includes(kwInput.trim()))setKws(p=>[...p,kwInput.trim()]);setKwInput("");e.preventDefault();}}} placeholder="ex: ortopedista belo horizonte"/>
              <button onClick={()=>{if(kwInput.trim()&&!kws.includes(kwInput.trim())){setKws(p=>[...p,kwInput.trim()]);}setKwInput("");}} style={{...css.btn(form.cor1,"#fff"),padding:"9px 14px",fontSize:"12px",whiteSpace:"nowrap"}}>+ Add</button>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"5px",minHeight:"28px"}}>
              {kws.map(k=>(<span key={k} style={{...css.badge(form.cor1+"18",form.cor1),border:`.5px solid ${form.cor1}`,padding:"3px 10px",fontSize:"12px"}}>{k}<span onClick={()=>setKws(p=>p.filter(x=>x!==k))} style={{cursor:"pointer",color:T.n300,fontSize:"15px",marginLeft:"5px"}}>×</span></span>))}
            </div>
            <div style={{...css.sec,marginTop:"14px"}}>Sugestões</div>
            <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
              {[...new Set([...(NICHOS[nichoKey]?.kws||[]).map(k=>k+" "+(form.cidade||"cidade")),`${form.categoria||"negócio"} ${form.cidade||"cidade"}`])].slice(0,8).map(sg=>(<button key={sg} onClick={()=>{if(!kws.includes(sg))setKws(p=>[...p,sg]);}} style={{...css.btnSm(kws.includes(sg)?form.cor1+"18":T.n0,kws.includes(sg)?form.cor1:T.n600,`.5px solid ${kws.includes(sg)?form.cor1:T.n200}`)}}>{sg}</button>))}
            </div>
          </div>
          <div style={{display:"flex",gap:"10px",justifyContent:"space-between"}}><Nav label="← Voltar" to={2} back/><Nav label="Próximo →" to={4}/></div>
        </div>}

        {/* P4 — Concorrentes (OPCIONAL) */}
        {pg===4&&<div>
          <div style={{...css.card(T.goldL),border:`.5px solid ${T.goldM}`,marginBottom:"10px"}}>
            <div style={{fontSize:"12px",color:T.gold,fontWeight:600,display:"flex",alignItems:"center",gap:"6px"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Seção opcional — sem concorrentes, a página não será gerada no PDF
            </div>
          </div>
          <div style={css.card()}>
            <div style={{fontSize:"13px",fontWeight:700,marginBottom:"4px",display:"flex",alignItems:"center",gap:"8px"}}>Concorrentes <span style={{background:"linear-gradient(90deg,#7C3AED,#4F46E5)",color:"#fff",fontSize:"10px",padding:"2px 8px",borderRadius:"20px",fontWeight:700}}>IA + Web</span></div>
            <SBar/>
            <button onClick={buscarConcs} disabled={concLoad} style={{...css.btn(form.cor1,"#fff"),opacity:concLoad?.7:1}}>
              {concLoad?"Buscando...":"Buscar concorrentes com IA"}
            </button>
            {concs.length>0&&<div style={{marginTop:"12px"}}>
              {concs.map((c,i)=>(<div key={i} style={{border:`.5px solid ${T.n200}`,borderRadius:"9px",padding:"11px 13px",marginBottom:"8px",background:T.n50}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <span style={{fontWeight:600,fontSize:"13px",color:T.n900}}>#{c.posicao} · {c.nome}</span>
                  <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
                    {!c.manual&&<span style={{background:"linear-gradient(90deg,#7C3AED,#4F46E5)",color:"#fff",fontSize:"9px",padding:"2px 7px",borderRadius:"10px"}}>IA</span>}
                    <span style={{fontSize:"12px",color:T.n400}}>{c.nota}★ ({c.avals})</span>
                    <span onClick={()=>setConcs(p=>p.filter((_,j)=>j!==i))} style={{cursor:"pointer",color:T.n300,fontSize:"16px",lineHeight:1}}>×</span>
                  </div>
                </div>
                {c.diferencial&&<div style={{fontSize:"11px",color:T.n400,marginTop:"4px"}}>{c.diferencial}</div>}
              </div>))}
            </div>}
          </div>
          {temConcs&&(
            <div style={css.card()}>
              <div style={css.sec}>Mapa de posicionamento</div>
              <div style={{borderRadius:"10px",overflow:"hidden",border:`.5px solid ${T.n200}`}} dangerouslySetInnerHTML={{__html:mapHtml}}/>
            </div>
          )}
          <div style={css.card()}>
            <div style={css.sec}>Adicionar manualmente</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"10px"}}>
              <div><label style={css.lbl}>Nome</label><input id="cNome" style={css.inp} placeholder="Concorrente"/></div>
              <div><label style={css.lbl}>Nota</label><input id="cNota" style={css.inp} type="number" placeholder="4.5" min="1" max="5" step="0.1"/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"10px"}}>
              <div><label style={css.lbl}>Avaliações</label><input id="cAvals" style={css.inp} type="number" placeholder="300"/></div>
              <div><label style={css.lbl}>Posição</label><input id="cPos" style={css.inp} type="number" placeholder="1"/></div>
            </div>
            <div style={{marginBottom:"10px"}}><label style={css.lbl}>Diferencial</label><input id="cDiff" style={css.inp} placeholder="Mais fotos, site otimizado..."/></div>
            <button onClick={addComp} style={css.btnSm(T.n0,T.n700)}>+ Adicionar</button>
          </div>
          <div style={{display:"flex",gap:"10px",justifyContent:"space-between"}}><Nav label="← Voltar" to={3} back/><Nav label="Próximo →" to={5}/></div>
        </div>}

        {/* P5 — Instagram (OPCIONAL) */}
        {pg===5&&<div>
          <div style={{...css.card(T.goldL),border:`.5px solid ${T.goldM}`,marginBottom:"10px"}}>
            <div style={{fontSize:"12px",color:T.gold,fontWeight:600,display:"flex",alignItems:"center",gap:"6px"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Seção opcional — sem link do Instagram, a página não será gerada no PDF
            </div>
          </div>

          <div style={css.card()}>
            <div style={{fontSize:"13px",fontWeight:700,marginBottom:"4px",display:"flex",alignItems:"center",gap:"8px"}}>
              Analisar Instagram
              <span style={{background:"linear-gradient(90deg,#7C3AED,#4F46E5)",color:"#fff",fontSize:"10px",padding:"2px 8px",borderRadius:"20px",fontWeight:700}}>IA</span>
            </div>
            <p style={{fontSize:"12px",color:T.n400,marginBottom:"10px"}}>Cole o link do perfil. A IA analisa e preenche os critérios automaticamente.</p>
            <div style={{display:"flex",gap:"8px",marginBottom:"12px"}}>
              <input style={css.inp} value={ig.url} onChange={e=>setIG("url",e.target.value)} placeholder="https://instagram.com/perfil"/>
              <button onClick={extrairIG} disabled={igLoad} style={{...css.btn(form.cor1,"#fff"),whiteSpace:"nowrap",opacity:igLoad?.7:1,fontSize:"12px",padding:"9px 14px"}}>
                {igLoad?"Analisando...":"Analisar"}
              </button>
            </div>
            <SBar/>
            {ig.extraido&&ig.handle&&(
              <div style={{padding:"10px 12px",background:T.okBg,borderRadius:"8px",border:`.5px solid #bbf7d0`,fontSize:"12px",color:T.ok,marginBottom:"8px"}}>
                Perfil @{ig.handle} analisado · {ig.seguidores} seguidores · Score: {ig.score}/100
              </div>
            )}
          </div>

          {(ig.url||ig.handle)&&(
            <div style={css.card()}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"14px"}}>
                <div><label style={css.lbl}>Handle (sem @)</label><input style={css.inp} value={ig.handle} onChange={e=>setIG("handle",e.target.value)} placeholder="perfil"/></div>
                <div><label style={css.lbl}>Seguidores</label><input style={css.inp} value={ig.seguidores} onChange={e=>setIG("seguidores",e.target.value)} placeholder="1.240"/></div>
              </div>
              <div style={css.sec}>Critérios de autoridade</div>
              <p style={{fontSize:"12px",color:T.n400,marginBottom:"12px"}}>Preenchidos pela IA. Ajuste se necessário.</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"12px"}}>
                <div>
                  <Tog checked={ig.bioOtimizada} onChange={v=>setIG("bioOtimizada",v)} label="Bio com especialidade e CTA"/>
                  <Tog checked={ig.linkBio} onChange={v=>setIG("linkBio",v)} label="Link na bio ativo"/>
                </div>
                <div>
                  <label style={css.lbl}>Frequência de posts</label>
                  <select style={css.inp} value={ig.frequencia} onChange={e=>setIG("frequencia",e.target.value)}>
                    <option value="nenhuma">Nenhuma</option><option value="raramente">Raramente</option><option value="mensal">Mensal</option><option value="semanal">Semanal</option><option value="diaria">Diária</option>
                  </select>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px",marginBottom:"14px"}}>
                <div><label style={css.lbl}>Qualidade visual</label>
                  <select style={css.inp} value={ig.qualVisual} onChange={e=>setIG("qualVisual",e.target.value)}>
                    <option value="ruim">Inconsistente</option><option value="media">Razoável</option><option value="boa">Profissional</option>
                  </select>
                </div>
                <div><label style={css.lbl}>Conteúdo de autoridade</label>
                  <select style={css.inp} value={ig.contAutoridade} onChange={e=>setIG("contAutoridade",e.target.value)}>
                    <option value="nenhum">Ausente</option><option value="parcial">Parcial</option><option value="completo">Consistente</option>
                  </select>
                </div>
                <div><label style={css.lbl}>Engajamento (%)</label>
                  <input style={css.inp} type="number" value={ig.engRate} min="0" max="20" step="0.1" onChange={e=>setIG("engRate",e.target.value)} placeholder="1.5"/>
                </div>
              </div>
              <div style={css.sec}>Score Instagram — {ig.score}/100</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"6px"}}>
                {igCrit.map(({l,pts,max})=>(
                  <div key={l} style={css.sbar}>
                    <div style={{fontSize:"11px",color:T.n600,width:"110px",flexShrink:0}}>{l}</div>
                    <div style={{flex:1,height:"5px",background:T.n100,borderRadius:"3px",overflow:"hidden"}}><div style={{width:`${(pts/max)*100}%`,height:"100%",background:pts===max?"#16A34A":pts>0?form.cor1:T.n200,borderRadius:"3px"}}/></div>
                    <div style={{fontSize:"11px",fontWeight:700,color:T.n700,minWidth:"34px",textAlign:"right"}}>{pts}/{max}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:"10px",justifyContent:"space-between"}}><Nav label="← Voltar" to={4} back/><Nav label="Próximo →" to={6}/></div>
        </div>}

        {/* P6 — Cores & Logo */}
        {pg===6&&<div>
          <div style={css.card()}>
            <div style={css.sec}>Paleta de cores</div>
            <div style={{display:"flex",gap:"7px",flexWrap:"wrap",marginBottom:"14px"}}>
              {[["#C9A84C","#0D0D0B"],["#0F4FD1","#0D0D0B"],["#0D9488","#0D0D0B"],["#7C3AED","#0D0D0B"],["#DC2626","#0D0D0B"],["#0891B2","#0D0D0B"],["#475569","#0D0D0B"]].map(([c1,c2],i)=>(
                <div key={i} onClick={()=>setForm(f=>({...f,cor1:c1,cor2:c2}))} style={{width:"28px",height:"28px",borderRadius:"50%",background:c1,cursor:"pointer",border:form.cor1===c1?`3px solid ${T.n900}`:`2px solid transparent`,transform:form.cor1===c1?"scale(1.2)":"scale(1)",transition:".12s"}}/>
              ))}
            </div>
            <div style={{display:"flex",gap:"20px",alignItems:"flex-start"}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"5px"}}><label style={css.lbl}>Cor principal</label><input type="color" value={form.cor1} onChange={e=>setForm(f=>({...f,cor1:e.target.value}))} style={{width:"50px",height:"38px",border:"none",borderRadius:"8px",cursor:"pointer"}}/></div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"5px"}}><label style={css.lbl}>Cor secundária</label><input type="color" value={form.cor2} onChange={e=>setForm(f=>({...f,cor2:e.target.value}))} style={{width:"50px",height:"38px",border:"none",borderRadius:"8px",cursor:"pointer"}}/></div>
              <div style={{flex:1}}><label style={{...css.lbl,marginBottom:"6px"}}>Prévia</label>
                <div style={{background:form.cor2,padding:"13px 16px",borderRadius:"9px",borderLeft:`6px solid ${form.cor1}`,color:form.cor1,fontWeight:700,fontSize:"14px"}}>{form.cslEmpresa||"Sua Empresa"}</div>
                <div style={{marginTop:"8px",background:form.cor1+"12",borderLeft:`3px solid ${form.cor1}`,padding:"9px 12px",borderRadius:"0 7px 7px 0",fontSize:"12px",color:T.n600}}>{form.nome||"Nome do negócio"}</div>
              </div>
            </div>
          </div>
          <div style={css.card()}>
            <div style={css.sec}>Logo da empresa consultora</div>
            <p style={{fontSize:"12px",color:T.n400,marginBottom:"12px"}}>Esta logo aparecerá no topo do PDF. Se não houver upload, usa o ícone padrão.</p>
            <div onClick={()=>logoRef.current?.click()} style={{border:`1.5px dashed ${T.n300}`,borderRadius:"10px",padding:"18px",textAlign:"center",cursor:"pointer",color:T.n400,fontSize:"13px"}}>
              {logoUrl?<div style={{background:form.cor2,padding:"14px",borderRadius:"8px",display:"inline-block"}}><img src={logoUrl} style={{maxHeight:"60px",maxWidth:"160px",objectFit:"contain",borderRadius:"4px",display:"block"}}/></div>:<div><div style={{color:T.n300,marginBottom:"5px"}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{display:"block",margin:"0 auto"}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div><div style={{fontWeight:600}}>Upload da logo</div><div style={{fontSize:"11px",marginTop:"3px",color:T.n400}}>PNG · SVG · fundo transparente recomendado</div></div>}
            </div>
            <input ref={logoRef} type="file" accept="image/*" style={{display:"none"}} onChange={loadLogo}/>
            {logoUrl&&<button onClick={()=>setLogoUrl("")} style={{...css.btnSm(T.n0,T.n400),marginTop:"8px"}}>Remover logo</button>}
          </div>
          <div style={css.card()}>
            <div style={css.sec}>Salvar configurações</div>
            <p style={{fontSize:"12px",color:T.n400,marginBottom:"12px"}}>Salve cores, logo, consultor e tom para reutilizar em outras análises.</p>
            {!showSave
              ?<button onClick={()=>setShowSave(true)} style={css.btnSm(T.goldL,T.gold,`.5px solid ${T.goldM}`)}>Salvar como preset</button>
              :<div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                <input style={{...css.inp,maxWidth:"220px"}} value={presetName} onChange={e=>setPresetName(e.target.value)} placeholder="Nome (ex: Clínica Dourado)" onKeyDown={e=>{if(e.key==="Enter")salvarPreset();}}/>
                <button onClick={salvarPreset} style={css.btnSm(T.gold,"#fff","none")}>Salvar</button>
                <button onClick={()=>setShowSave(false)} style={css.btnSm(T.n0,T.n400)}>Cancelar</button>
              </div>
            }
            <SBar/>
          </div>
          <div style={{display:"flex",gap:"10px",justifyContent:"space-between"}}><Nav label="← Voltar" to={5} back/><Nav label="Próximo →" to={7}/></div>
        </div>}

        {/* P7 — Consultor */}
        {pg===7&&<div>
          <div style={css.card()}>
            <div style={css.sec}>Dados do consultor</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"10px"}}>
              <div><label style={css.lbl}>Seu nome *</label><input style={css.inp} value={form.cslNome} onChange={e=>setF("cslNome",e.target.value)} placeholder="Nathan"/></div>
              <div><label style={css.lbl}>Empresa *</label><input style={css.inp} value={form.cslEmpresa} onChange={e=>setF("cslEmpresa",e.target.value)} placeholder="SCentral"/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"12px"}}>
              <div><label style={css.lbl}>WhatsApp (gera QR no PDF)</label><input style={css.inp} value={form.cslWhats} onChange={e=>setF("cslWhats",e.target.value)} placeholder="(37) 9 9809-2139"/></div>
              <div><label style={css.lbl}>Instagram (sem @)</label><input style={css.inp} value={form.cslInsta} onChange={e=>setF("cslInsta",e.target.value)} placeholder="scentral.ia"/></div>
            </div>
            {form.cslWhats&&<div style={{padding:"12px",background:T.n50,borderRadius:"9px",display:"flex",alignItems:"center",gap:"12px",marginBottom:"12px",border:`.5px solid ${T.n200}`}}>
              <img src={qrUrl(waLink(form.cslWhats))} alt="QR" style={{width:"64px",height:"64px",borderRadius:"6px"}}/>
              <div><div style={{fontSize:"12px",fontWeight:700,color:T.n900,marginBottom:"3px"}}>QR Code — prévia</div><div style={{fontSize:"11px",color:T.n400}}>{waLink(form.cslWhats)}</div></div>
            </div>}
            <div><label style={css.lbl}>Instrução extra para a IA</label>
              <textarea style={{...css.inp,minHeight:"60px",resize:"vertical"}} value={form.promptExtra} onChange={e=>setF("promptExtra",e.target.value)} placeholder="Ex: mencionar rapidez das melhorias, focar em ROI, citar mercado local..."/>
            </div>
          </div>
          <div style={{display:"flex",gap:"10px",justifyContent:"space-between"}}><Nav label="← Voltar" to={6} back/><Nav label="Editar & PDF →" to={8}/></div>
        </div>}

        {/* P8 — Editar & PDF */}
        {pg===8&&<div>
          <div style={css.card()}>
            <div style={{fontSize:"13px",fontWeight:700,marginBottom:"4px"}}>Editar textos</div>
            <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 12px",background:form.cor1+"0d",borderRadius:"9px",marginBottom:"14px",border:`.5px solid ${form.cor1}33`}}>
              <div style={{flex:1}}><div style={{fontSize:"12px",fontWeight:700,color:form.cor1}}>{tonAtual.label}</div><div style={{fontSize:"11px",color:T.n400,marginTop:"2px"}}>{tonAtual.desc}</div></div>
            </div>

            {/* Resumo do que será gerado */}
            <div style={{padding:"10px 14px",background:T.n50,borderRadius:"8px",border:`.5px solid ${T.n200}`,marginBottom:"14px",fontSize:"12px",color:T.n600}}>
              <div style={{fontWeight:700,color:T.n900,marginBottom:"6px"}}>Páginas que serão geradas:</div>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                <span style={{...css.badge(T.okBg,T.ok)}}>01 Introdução</span>
                {temDadosGoogle&&<span style={{...css.badge(T.okBg,T.ok)}}>02 Google</span>}
                {temConcs&&<span style={{...css.badge(T.okBg,T.ok)}}>03 Concorrentes</span>}
                {temIG&&<span style={{...css.badge(T.okBg,T.ok)}}>0{temDadosGoogle&&temConcs?4:temDadosGoogle||temConcs?3:2} Instagram</span>}
                <span style={{...css.badge(T.okBg,T.ok)}}>Próximos Passos</span>
                {!temDadosGoogle&&<span style={{...css.badge(T.warnBg,T.warn)}}>Sem métricas Google</span>}
                {!temConcs&&<span style={{...css.badge(T.warnBg,T.warn)}}>Sem concorrentes</span>}
                {!temIG&&<span style={{...css.badge(T.warnBg,T.warn)}}>Sem Instagram</span>}
              </div>
            </div>

            <SBar/>
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"16px"}}>
              <button onClick={gerarTextoIA} disabled={loading} style={{...css.btn(form.cor1,"#fff"),opacity:loading?.7:1,fontSize:"12px",padding:"8px 14px"}}>
                {loading?"Gerando...":"Gerar textos com IA"}
              </button>
              <button onClick={()=>setTextos(null)} style={css.btnSm(T.n0,T.n600)}>Restaurar padrão</button>
              <button onClick={abrirPDF} style={css.btnSm(T.dark,"#fff","none")}>Gerar PDF</button>
            </div>

            {[
              {idx:1,titulo:"Introdução",campos:[{k:"tituloIntro",l:"Título",multi:false},{k:"intro",l:"Texto de abertura"}]},
              ...(temDadosGoogle?[{idx:2,titulo:"Presença Google",campos:[{k:"tituloAnalise",l:"Título",multi:false},{k:"problema",l:"Contexto"},{k:"dados",l:"Números"}]}]:[]),
              ...(temConcs?[{idx:3,titulo:"Concorrentes",campos:[{k:"tituloConc",l:"Título",multi:false},{k:"diferenciais",l:"Análise comparativa"}]}]:[]),
              ...(temIG?[{idx:4,titulo:"Instagram",campos:[{k:"tituloIg",l:"Título",multi:false},{k:"igAnalise",l:"Análise do perfil"}]}]:[]),
              {idx:5,titulo:"Próximos Passos",campos:[{k:"tituloProx",l:"Título",multi:false},{k:"proximos",l:"CTA"}]},
            ].map(({idx,titulo,campos})=>(
              <div key={idx} style={{background:T.n50,borderRadius:"10px",padding:"14px",marginBottom:"12px",borderLeft:`3px solid ${form.cor1}`}}>
                <div style={{fontSize:"10px",fontWeight:700,color:form.cor1,textTransform:"uppercase",letterSpacing:".08em",marginBottom:"12px"}}>Página {idx} — {titulo}</div>
                {campos.map(({k,l,multi=true})=>(<TxField key={k} label={l} campo={k} multi={multi}/>))}
              </div>
            ))}

            <div style={{marginTop:"16px",borderTop:`.5px solid ${T.n200}`,paddingTop:"16px"}}>
              <div style={{fontSize:"10px",fontWeight:700,color:T.n400,textTransform:"uppercase",letterSpacing:".1em",marginBottom:"10px"}}>Prévia</div>
              <div style={{borderRadius:"10px",overflow:"hidden",border:`.5px solid ${form.cor1}33`}}>
                <div style={{background:form.cor2,padding:"16px",textAlign:"center"}}>
                  <img src={logoUrl||LOGO_B64} style={{maxHeight:"40px",maxWidth:"130px",objectFit:"contain",display:"block",margin:"0 auto 8px"}}/>
                  <div style={{fontSize:"16px",fontWeight:800,color:form.cor1}}>{form.cslEmpresa||"Sua Empresa"}</div>
                </div>
                <div style={{background:"#fff",padding:"14px"}}>
                  <div style={{background:form.cor1+"12",borderLeft:`3px solid ${form.cor1}`,padding:"10px 14px",borderRadius:"0 6px 6px 0",marginBottom:"10px"}}>
                    <div style={{fontSize:"13px",fontWeight:700,color:T.n900}}>{form.nome||"Nome do negócio"}</div>
                    <div style={{fontSize:"11px",color:T.n400,marginTop:"2px"}}>{form.categoria} · {form.cidade}</div>
                  </div>
                  <div style={{fontSize:"12px",color:T.n600,lineHeight:1.6}} dangerouslySetInnerHTML={{__html:tx.intro||""}}/>
                </div>
              </div>
            </div>

            <div style={{display:"flex",gap:"10px",marginTop:"16px",justifyContent:"space-between"}}>
              <Nav label="← Voltar" to={7} back/>
              <button onClick={abrirPDF} style={{...css.btn(T.dark,"#fff"),padding:"11px 22px",fontSize:"14px"}}>Gerar PDF</button>
            </div>
          </div>
        </div>}

      </div>
    </div>
  );
}

/* ─── BUILD PDF ──────────────────────────────────────────── */
function buildPDF({form,ig,kws,concs,logoUrl,textos,temDadosGoogle,temConcs,temIG}) {
  const c1=form.cor1||T.gold, c2=form.cor2||T.dark;
  const empresa=form.cslEmpresa||"SCentral";
  const t=textos;
  const wUrl=waLink(form.cslWhats);

  const logoHtml=logoUrl
    ?`<img src="${logoUrl}" style="max-height:52px;max-width:150px;object-fit:contain;display:block;margin:0 auto 12px"/>`
    :`<img src="${LOGO_B64}" style="max-height:52px;max-width:150px;object-fit:contain;display:block;margin:0 auto 12px"/>`;

  const kwsHtml=(kws||[]).map(k=>`<span style="background:${c1}18;color:${c1};border:.5px solid ${c1}44;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:600;margin:2px;display:inline-block">${k}</span>`).join("");
  const qrHtml=wUrl?`<div style="text-align:center;margin:16px 0"><img src="${qrUrl(wUrl)}" width="130" height="130" style="border-radius:10px;border:2px solid ${c1}"/><div style="font-size:11px;color:#aaa;margin-top:7px">Escanear para WhatsApp</div><div style="font-size:12px;font-weight:700;color:#fff;margin-top:3px">${form.cslWhats}</div></div>`:"";

  const critHtml=(pts,max,label)=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px"><div style="font-size:11px;color:${T.n600};width:140px;flex-shrink:0">${label}</div><div style="flex:1;height:6px;background:${T.n100};border-radius:3px;overflow:hidden"><div style="width:${(pts/max)*100}%;height:100%;background:${pts===max?"#16A34A":pts>0?c1:"transparent"};border-radius:3px"></div></div><div style="font-size:11px;font-weight:700;color:${T.n700};min-width:36px;text-align:right">${pts}/${max}</div></div>`;

  // Calcula número de páginas e numeração
  let pgCount=1; // intro sempre
  if(temDadosGoogle) pgCount++;
  if(temConcs) pgCount++;
  if(temIG) pgCount++;
  pgCount++; // próximos passos
  let pgCur=0;
  const pgNum=()=>{pgCur++;return`<div style="text-align:right;font-size:10px;color:${T.n400};margin-top:auto;padding-top:12px;border-top:.5px solid ${T.n200}">0${pgCur} / 0${pgCount}</div>`;};

  // Google data
  const nota=parseFloat(form.nota)||0;
  const stars=nota?"★".repeat(Math.floor(nota))+"☆".repeat(5-Math.floor(nota)):"";
  const gSVG=temDadosGoogle?gaugeStatic(form.score):"";
  const gCrits=temDadosGoogle?[
    {l:"Nota Google",pts:Math.round(Math.min((parseFloat(form.nota)||0)/5*25,25)),max:25},
    {l:"Nº de avaliações",pts:Math.round(Math.min((parseInt(form.numAvals)||0)/200*20,20)),max:20},
    {l:"Fotos Google",pts:Math.round(Math.min((parseInt(form.numFotos)||0)/20*15,15)),max:15},
    {l:"Site ativo",pts:form.temSite?10:0,max:10},
    {l:"WhatsApp na ficha",pts:form.temWhats?10:0,max:10},
    {l:"Posts ativos",pts:form.postsAtivos?10:0,max:10},
    {l:"Frequência posts",pts:{nenhuma:0,raramente:3,mensal:5,semanal:8,diaria:10}[form.frequencia]||0,max:10},
  ].map(({l,pts,max})=>critHtml(pts,max,l)).join(""):"";

  const igCrits=temIG?[
    {l:"Bio otimizada",pts:ig.bioOtimizada?15:0,max:15},
    {l:"Frequência posts",pts:{nenhuma:0,raramente:5,mensal:8,semanal:14,diaria:20}[ig.frequencia]||0,max:20},
    {l:"Qualidade visual",pts:{ruim:0,media:8,boa:15}[ig.qualVisual]||0,max:15},
    {l:"Conteúdo autoridade",pts:{nenhum:0,parcial:12,completo:20}[ig.contAutoridade]||0,max:20},
    {l:"Engajamento",pts:Math.round(Math.min((parseFloat(ig.engRate)||0)/3*25,25)),max:25},
    {l:"Link na bio",pts:ig.linkBio?5:0,max:5},
  ].map(({l,pts,max})=>critHtml(pts,max,l)).join(""):"";

  const mapSVG=temConcs?makeMapStatic({concs,cidade:form.cidade||"Cidade",nome:form.nome||"Negócio",cor1:c1}):"";
  const compRows=temConcs?(concs||[]).map((c,i)=>`<div style="display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid ${T.n100}"><div style="width:24px;height:24px;border-radius:50%;background:${c1};color:#fff;font-weight:800;font-size:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;min-width:24px">${c.posicao||i+1}</div><div><strong style="font-size:13px;color:${T.n900}">${c.nome}</strong><br><span style="color:${T.n400};font-size:11px">${c.nota}★ (${c.avals})${c.diferencial?" · "+c.diferencial:""}</span></div></div>`).join(""):"";

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>Diagnóstico ${form.nome}</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&amp;family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Space Grotesk','Manrope',sans-serif;background:#fff;color:${T.n900};font-size:13px;line-height:1.65}
.pg{width:210mm;min-height:297mm;position:relative;page-break-after:always;background:#fff;display:flex;flex-direction:column}
.bar{position:absolute;left:0;top:0;bottom:0;width:6px;background:${c1}}
.cnt{margin-left:6px;padding:28px 38px 28px 32px;flex:1;display:flex;flex-direction:column}
.st{font-size:18px;font-weight:800;text-align:center;color:${T.n900};margin:18px 0 14px;padding-bottom:7px;border-bottom:1.5px solid ${c1};letter-spacing:-.2px}
.nb{background:${c1}12;border-left:3px solid ${c1};padding:11px 15px;margin-bottom:16px;border-radius:0 8px 8px 0}
.nb h2{font-size:16px;font-weight:800;color:${T.n900};letter-spacing:-.2px}
.nb .sub{font-size:11px;color:${T.n400};margin-top:2px}
p{margin-bottom:10px;color:${T.n600}}
strong{font-weight:700;color:${T.n900}}
.ac{background:${c1}0d;border:.5px solid ${c1}33;border-left:2.5px solid ${c1};border-radius:0 8px 8px 0;padding:12px 14px;margin:11px 0}
.ac p{color:${T.n700};margin-bottom:5px;font-size:13px}.ac p:last-child{margin-bottom:0}
.rank{display:flex;align-items:center;gap:11px;background:${c1}0d;border-radius:8px;padding:10px 14px;margin:11px 0}
.rank-n{background:${c1};color:#fff;font-weight:800;font-size:13px;border-radius:50%;width:34px;height:34px;min-width:34px;display:flex;align-items:center;justify-content:center}
.map-box{border-radius:10px;overflow:hidden;margin:12px 0;border:.5px solid #dce8f5}
.cta{background:${c2};border-radius:12px;padding:20px;margin:16px 0}
.cta h3{font-size:17px;font-weight:800;color:${c1};margin-bottom:9px}
.chip{background:${c1};color:#fff;font-weight:700;padding:6px 14px;border-radius:20px;font-size:12px;display:inline-block;margin:3px}
.fsig{text-align:center;margin-top:18px;color:#aaa;font-size:11px;padding-top:11px;border-top:.5px solid #333}
.crow{display:flex;align-items:center;justify-content:center;gap:24px;margin-top:14px;flex-wrap:wrap}
@page{size:A4;margin:0}
</style></head><body>

<div class="pg"><div class="bar"></div><div class="cnt">
  <div style="background:${c2};padding:18px;border-radius:10px;text-align:center;margin-bottom:20px">
    ${logoHtml}
    <div style="font-size:20px;font-weight:800;color:${c1};letter-spacing:-.2px">${empresa}</div>
    <div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#555;margin-top:4px">Diagnóstico de Presença Digital</div>
  </div>
  <div class="nb"><h2>${form.nome||"Nome do negócio"}</h2><div class="sub">${form.categoria}${form.especializacao?" · "+form.especializacao:""} · ${form.cidade}${form.estado?", "+form.estado:""}</div></div>
  <div class="st">${t.tituloIntro}</div>
  <p>${t.intro}</p>
  ${form.endereco?`<p style="font-size:12px;color:${T.n400}">📍 ${form.endereco}</p>`:""}
  ${nota?`<div style="border:.5px solid ${T.n200};border-radius:9px;padding:11px 14px;margin:11px auto;max-width:270px;background:#fff"><div style="font-size:13px;font-weight:700;color:#1a73e8;margin-bottom:2px">${form.nome}</div><div style="color:#fbbc04;font-size:12px">${stars} <span style="color:${T.n400};font-size:11px">${form.nota} · ${form.numAvals} avaliações</span></div><div style="color:${T.n400};font-size:11px;margin-top:2px">${form.categoria}</div></div>`:""}
  <p style="margin-top:8px">Esta análise segue <strong>critérios objetivos</strong> — os mesmos que o Google usa para definir quem aparece primeiro quando alguém busca por ${form.categoria} em ${form.cidade}.</p>
  ${pgNum()}
</div></div>

${temDadosGoogle?`
<div class="pg"><div class="bar"></div><div class="cnt">
  <div class="st">${t.tituloAnalise}</div>
  ${kwsHtml?`<div style="margin-bottom:12px">${kwsHtml}</div>`:""}
  <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;margin:14px 0">
    <div>${gSVG}</div>
    <div style="flex:1;min-width:180px">${gCrits}</div>
  </div>
  <div class="ac"><p>${t.problema}</p></div>
  <div class="rank"><div class="rank-n">${form.posicao||"—"}</div><div><strong>${form.nome}</strong><br><span style="color:${T.n400};font-size:11px">${form.nota}★ · ${form.numAvals} avaliações · ${form.numFotos} fotos</span></div></div>
  <p style="font-size:12px;color:${T.n400};margin-top:8px">${t.dados}</p>
  ${pgNum()}
</div></div>`:""}

${temConcs?`
<div class="pg"><div class="bar"></div><div class="cnt">
  <div class="st">${t.tituloConc}</div>
  <div class="map-box">${mapSVG}</div>
  <p>${t.diferenciais}</p>
  ${compRows}
  ${pgNum()}
</div></div>`:""}

${temIG?`
<div class="pg"><div class="bar"></div><div class="cnt">
  <div class="st">${t.tituloIg}</div>
  <div style="background:${T.n50};border:.5px solid ${T.n200};border-radius:10px;padding:16px;text-align:center;margin-bottom:14px">
    <div style="font-size:14px;font-weight:700;color:#1a1a1a;margin-bottom:3px">@${ig.handle||"perfil"}</div>
    <div style="font-size:12px;color:${T.n400}">${ig.seguidores?ig.seguidores+" seguidores":""}</div>
  </div>
  <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:14px">
    <div style="text-align:center;flex-shrink:0"><div style="font-size:38px;font-weight:800;color:${parseInt(ig.score)<40?"#DC2626":parseInt(ig.score)<70?"#F59E0B":c1};letter-spacing:-1px;line-height:1">${ig.score}</div><div style="font-size:11px;color:${T.n400};margin-top:2px">/ 100</div></div>
    <div style="flex:1;min-width:180px">${igCrits}</div>
  </div>
  <div class="ac"><p>${t.igAnalise}</p></div>
  ${pgNum()}
</div></div>`:""}

<div class="pg"><div class="bar"></div><div class="cnt">
  <div class="st">${t.tituloProx}</div>
  <p>${t.proximos}</p>
  <p>Posso apresentar um <strong>plano de ação personalizado</strong> para o <strong>${form.nome}</strong> em <strong>${form.cidade}</strong> — com as ações que fazem mais sentido para o seu momento agora.</p>
  <div class="cta">
    <h3>${form.tom==="original"?"Próximos passos":"Vamos conversar?"}</h3>
    <div class="crow">
      <div>${qrHtml}</div>
      <div style="text-align:left">
        ${form.cslWhats?`<div class="chip" style="display:block;margin-bottom:8px">WhatsApp · ${form.cslWhats}</div>`:""}
        ${form.cslInsta?`<div class="chip">Instagram · @${form.cslInsta}</div>`:""}
      </div>
    </div>
  </div>
  <div class="fsig">
    <p style="font-weight:800;color:#fff;font-size:13px">${form.cslNome||"—"}</p>
    <p style="margin-top:4px;color:${c1};font-weight:700;letter-spacing:.04em">${empresa}</p>
  </div>
  ${pgNum()}
</div></div>

</body></html>`;
}
