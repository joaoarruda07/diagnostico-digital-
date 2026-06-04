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
  <img src={LOGO_B64} alt="SCentral" style={{height:`${size}px`,width:`${size}px`,objectFit:"cover",display:"block",margin:"0 auto",mixBlendMode:"lighten",borderRadius:"14px"}}/>
);

/* ─── APP ────────────────────────────────────────────────── */
const IG_CRITERIOS = [
  {
    k:"postaFreq", label:"Posta frequentemente?",
    critica:{
      original:"A frequência atual de publicações é insuficiente para manter relevância perante o algoritmo e a audiência. A falta de constância reduz o alcance do perfil, enfraquece a construção de autoridade e limita oportunidades de conversão.",
      parceiro:"A frequência de posts tem espaço para crescer. Com uma cadência mais consistente, o perfil ganha mais alcance orgânico e mantém a audiência engajada ao longo do tempo.",
      autoridade:"Perfis com alta frequência de publicação têm até 3x mais alcance orgânico. A regularidade de conteúdo é um dos principais sinais que o algoritmo usa para distribuir posts."
    }
  },
  {
    k:"temIA", label:"Tem posts com IA?",
    criticaPositiva: true,
    critica:{
      original:"Foi identificado uso excessivo de conteúdos gerados por IA. Isso reduz a percepção de autenticidade da marca e pode transmitir uma comunicação genérica ao público.",
      parceiro:"O uso de IA para apoiar a criação de conteúdo é válido, mas o equilíbrio com conteúdo autêntico é fundamental para manter a identidade da marca.",
      autoridade:"O uso intensivo de conteúdo gerado por IA afeta negativamente métricas de engajamento. A autenticidade é fator chave no ranqueamento algorítmico do Instagram."
    }
  },
  {
    k:"temVitrine", label:"Tem conteúdo vitrine?",
    critica:{
      original:"O perfil apresenta poucas evidências dos produtos, serviços ou diferenciais. Novos visitantes não conseguem entender rapidamente o que a empresa oferece.",
      parceiro:"Adicionar conteúdo que mostre seus produtos, serviços e resultados ajudaria visitantes a entenderem o valor do que você oferece logo de cara.",
      autoridade:"Conteúdo vitrine é fundamental para conversão. Perfis sem apresentação clara de serviços têm taxa de saída significativamente maior em novas visitas."
    }
  },
  {
    k:"temBio", label:"Tem bio bem feita?",
    critica:{
      original:"A biografia não comunica a proposta de valor da empresa. Como a bio é um dos primeiros elementos analisados pelos visitantes, isso pode reduzir a geração de contatos.",
      parceiro:"Uma bio mais estratégica, com proposta de valor clara e CTA, pode aumentar significativamente a conversão de visitantes em seguidores e clientes.",
      autoridade:"A bio é o primeiro ponto de decisão do visitante. Perfis com bio otimizada (especialidade + CTA + link) convertem até 2x mais do que perfis genéricos."
    }
  },
  {
    k:"temIdentidade", label:"Tem identidade visual bem feita?",
    critica:{
      original:"A identidade visual atual não transmite consistência suficiente. A falta de padronização reduz a percepção de profissionalismo e confiança.",
      parceiro:"Investir em consistência visual — paleta, tipografia e estilo de imagens — fortalece o reconhecimento da marca e transmite mais profissionalismo.",
      autoridade:"Perfis com identidade visual consistente têm engajamento médio 40% maior. A percepção de profissionalismo é fator decisivo na escolha entre concorrentes."
    }
  },
  {
    k:"comunicaAutoridade", label:"Comunica autoridade?",
    critica:{
      original:"O perfil não evidencia a experiência ou expertise da empresa. Isso dificulta o posicionamento como referência e faz potenciais clientes escolherem concorrentes.",
      parceiro:"Compartilhar conhecimento, bastidores e resultados ajuda a posicionar a empresa como referência e aumenta a confiança de novos visitantes.",
      autoridade:"Conteúdo de autoridade (educativo, técnico, bastidores) é o tipo com maior potencial de compartilhamento orgânico e geração de leads qualificados."
    }
  },
  {
    k:"temProvaSocial", label:"Tem prova social?",
    critica:{
      original:"O perfil apresenta poucas evidências de resultados, depoimentos ou experiências de clientes. A ausência de prova social reduz a credibilidade e dificulta a conversão.",
      parceiro:"Depoimentos, resultados e histórias de clientes são poderosos para construir confiança. Incluir esse tipo de conteúdo pode aumentar muito a geração de novos contatos.",
      autoridade:"93% dos consumidores verificam avaliações antes de contratar. Perfis com prova social ativa têm taxa de conversão até 3x maior do que sem."
    }
  },
];

const NICHO_PLACE_TYPES = {
  clinica: ["doctor","medical_clinic","health"],
  vet: ["veterinary_care"],
  restaurante: ["restaurant","food","meal_delivery"],
  adv: ["lawyer","legal_services"],
  odonto: ["dentist","dental_clinic"],
  academia: ["gym","fitness_center","sports_club"],
  salao: ["beauty_salon","hair_care","spa"],
  imob: ["real_estate_agency"],
  contabil: ["accounting","finance"],
  escola: ["school","university","education"],
  psico: ["psychologist","mental_health"],
  outro: ["establishment"],
};

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
  const [kws, setKws] = useState([]); // [{term, volume, pos}]
  const [kwInput, setKwInput] = useState("");
  const [concs, setConcs] = useState([]);
  const [logoUrl, setLogoUrl] = useState("");
  const [textos, setTextos] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [concLoad, setConcLoad] = useState(false);
  const [fichaLoad, setFichaLoad] = useState(false);
  const [layoutPDF, setLayoutPDF] = useState("premium"); // basico|premium|luxo|relatorio|custom
  const [showRef, setShowRef] = useState(false);
  const [refPdfName, setRefPdfName] = useState("");
  const [refPdfB64, setRefPdfB64] = useState("");
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
    const url=form.fichaUrl.trim();
    if(!url){setStatus({t:"err",m:"Cole o link ou nome do negócio."});return;}
    setFichaLoad(true);
    setStatus({t:"load",m:"Analisando negócio com IA..."});
    try {
      // Extrai nome da URL se for link do Maps
      let query=url;
      const mName=url.match(/maps\/place\/([^/@?&]+)/);
      const mQ=url.match(/[?&]q=([^&]+)/);
      if(mName) query=decodeURIComponent(mName[1].replace(/\+/g," ")).replace(/\s*maps\s*$/i,"").trim();
      else if(mQ) query=decodeURIComponent(mQ[1].replace(/\+/g," ")).replace(/\s*maps\s*$/i,"").trim();

      // Extrai coordenadas se disponível
      const mCoord=url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      const lat=mCoord?mCoord[1]:"";
      const lng=mCoord?mCoord[2]:"";

      const resp=await fetch("/api/claude",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-6",
          max_tokens:800,
          messages:[{role:"user",content:`Você é especialista em negócios locais brasileiros.

Busque informações sobre este negócio no Google Maps: "${query}"
${lat&&lng?`Localização aproximada: ${lat}, ${lng}`:""}

Com base no seu conhecimento, retorne SOMENTE JSON sem markdown:
{
  "nome": "nome completo do negócio",
  "categoria": "tipo de negócio",
  "especializacao": "especialidade se houver",
  "cidade": "cidade",
  "estado": "UF",
  "nota": "nota de 0 a 5 com uma casa decimal",
  "numAvals": "número estimado de avaliações",
  "numFotos": "número estimado de fotos",
  "temSite": true ou false,
  "temWhats": true ou false,
  "postsAtivos": true ou false,
  "frequencia": "nenhuma/raramente/mensal/semanal/diaria",
  "site": "url do site se souber",
  "whatsapp": "telefone se souber",
  "posicao": "posição estimada nas buscas locais 1-20"
}

Se não conhecer o negócio específico, use benchmarks típicos do segmento na região.`}]})});
      const data=await resp.json();
      const text=data.content?.filter(b=>b.type==="text").map(b=>b.text).join("")||"";
      const s=text.indexOf("{"),e=text.lastIndexOf("}");
      if(s<0) throw new Error();
      const p=JSON.parse(text.slice(s,e+1));
      const next={...form,nichoKey};
      ["nome","categoria","especializacao","cidade","estado","nota","numAvals","numFotos","site","whatsapp","posicao"].forEach(k=>{
        if(p[k]!=null&&String(p[k]).trim()) next[k]=String(p[k]);
      });
      if(typeof p.temSite==="boolean") next.temSite=p.temSite;
      if(typeof p.temWhats==="boolean") next.temWhats=p.temWhats;
      if(typeof p.postsAtivos==="boolean") next.postsAtivos=p.postsAtivos;
      if(p.frequencia) next.frequencia=p.frequencia;
      if(lat) next.placeLat=lat;
      if(lng) next.placeLng=lng;
      if(next.nota||next.numAvals) next.score=String(calcScore(next));
      setForm(next);
      // Auto nicho
      const cat=(p.categoria||"").toLowerCase();
      const found=Object.entries(NICHOS).find(([,v])=>cat.includes(v.label.toLowerCase().split(" ")[0]));
      if(found) setNichoKey(found[0]);
      setStatus({t:"ok",m:`✓ "${next.nome}" carregado! Confira e ajuste se necessário.`});
    } catch(e){
      setStatus({t:"err",m:"Não foi possível extrair. Preencha manualmente."});
    }
    setFichaLoad(false);
  };

  const extrairIG = async () => {
    const url=ig.url.trim();
    if(!url){setStatus({t:"err",m:"Cole o link do perfil."});return;}
    setIgLoad(true);
    setStatus({t:"load",m:"Analisando perfil do Instagram..."});
    try {
      // Extrai o handle da URL
      const handleMatch=url.match(/instagram\.com\/([^/?#]+)/);
      const handle=handleMatch?handleMatch[1].replace("@",""):url.replace("@","").replace(/.*instagram\.com\//,"");
      
      const resp=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-6",
          max_tokens:900,
          messages:[{role:"user",content:`Você é um especialista em marketing digital brasileiro.
Analise o perfil do Instagram @${handle} do segmento "${form.categoria||"negócio local"}" em ${form.cidade||"Brasil"}.

Com base no seu conhecimento sobre este perfil ou perfis similares deste segmento, estime os critérios abaixo.
Se não conhecer o perfil específico, use benchmarks típicos do segmento.

Retorne SOMENTE JSON sem markdown:
{
  "handle":"${handle}",
  "seguidores":"estimativa numérica",
  "bioOtimizada":true/false,
  "linkBio":true/false,
  "frequencia":"nenhuma/raramente/mensal/semanal/diaria",
  "qualVisual":"ruim/media/boa",
  "contAutoridade":"nenhum/parcial/completo",
  "engRate":"porcentagem estimada",
  "postaFreq":true/false,
  "temIA":false,
  "temVitrine":true/false,
  "temBio":true/false,
  "temIdentidade":true/false,
  "comunicaAutoridade":true/false,
  "temProvaSocial":true/false
}`}]})});
      const data=await resp.json();
      const text=data.content?.filter(b=>b.type==="text").map(b=>b.text).join("")||"";
      const s=text.indexOf("{"),e=text.lastIndexOf("}");
      if(s<0) throw new Error();
      const p=JSON.parse(text.slice(s,e+1));
      const next={...ig,url,extraido:true};
      Object.keys(p).forEach(k=>{if(p[k]!==undefined)next[k]=p[k];});
      next.score=String(calcIgScore(next));
      setIg(next);
      setStatus({t:"ok",m:`✓ Perfil @${handle} analisado!`});
    } catch(e){
      console.error("extrairIG error:", e);
      setStatus({t:"err",m:`Erro: ${e.message||"Tente novamente."}`});
    }
    setIgLoad(false);
  };

  const buscarConcs = async () => {
    if(!form.categoria&&!form.cidade){setStatus({t:"err",m:"Preencha categoria e cidade na etapa 1."});return;}
    setConcLoad(true);
    setStatus({t:"load",m:"Buscando concorrentes com IA..."});
    try {
      const resp=await fetch("/api/claude",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-6",
          max_tokens:1000,
          messages:[{role:"user",content:`Liste os 5 principais concorrentes reais de "${form.categoria}${form.especializacao?" - "+form.especializacao:""}" em ${form.cidade}, ${form.estado||"Brasil"}.

Use seu conhecimento sobre negócios locais desta cidade. Liste estabelecimentos que realmente existem ou são típicos deste mercado.

Retorne SOMENTE JSON sem markdown:
{"concorrentes":[
  {"posicao":1,"nome":"Nome Real","nota":"4.8","avals":"320","diferencial":"principal diferencial em 1 frase curta"}
]}`}]})});
      const data=await resp.json();
      const text=data.content?.filter(b=>b.type==="text").map(b=>b.text).join("")||"";
      const s=text.indexOf("{"),e=text.lastIndexOf("}");
      const parsed=JSON.parse(text.slice(s,e+1));
      const novos=(parsed.concorrentes||[]).map(c=>({...c,manual:false}));
      setConcs([...novos,...concs.filter(c=>c.manual)]);
      setStatus({t:"ok",m:`✓ ${novos.length} concorrentes encontrados!`});
    } catch(e){
      setStatus({t:"err",m:"Erro. Adicione manualmente."});
    }
    setConcLoad(false);
  };

  // Volumes estimados por segmento (buscas mensais médias em capitais brasileiras)
  const KW_VOLUMES = {
    "clínica médica":{"capital":2400,"interior":800,"pequena":300},
    "médico particular":{"capital":3600,"interior":1200,"pequena":400},
    "consulta médica":{"capital":2900,"interior":900,"pequena":350},
    "veterinária":{"capital":1900,"interior":700,"pequena":250},
    "veterinário":{"capital":2200,"interior":800,"pequena":280},
    "restaurante":{"capital":5400,"interior":1800,"pequena":600},
    "advogado":{"capital":2800,"interior":900,"pequena":320},
    "dentista":{"capital":3100,"interior":1100,"pequena":380},
    "odontologia":{"capital":1800,"interior":650,"pequena":220},
    "academia":{"capital":4200,"interior":1500,"pequena":500},
    "salão de beleza":{"capital":3800,"interior":1400,"pequena":450},
    "imobiliária":{"capital":2600,"interior":900,"pequena":300},
    "contador":{"capital":2100,"interior":750,"pequena":260},
    "contabilidade":{"capital":1900,"interior":680,"pequena":230},
    "psicólogo":{"capital":2400,"interior":850,"pequena":280},
    "terapia":{"capital":1800,"interior":620,"pequena":200},
    "escola":{"capital":3200,"interior":1200,"pequena":400},
    "ortopedista":{"capital":1600,"interior":580,"pequena":190},
    "cardiologista":{"capital":1400,"interior":500,"pequena":160},
    "dermatologista":{"capital":1700,"interior":600,"pequena":200},
    "ginecologista":{"capital":1500,"interior":540,"pequena":175},
    "nutricionista":{"capital":1900,"interior":680,"pequena":220},
    "fisioterapeuta":{"capital":1600,"interior":570,"pequena":185},
    "personal trainer":{"capital":2100,"interior":750,"pequena":240},
    "varizes":{"capital":1200,"interior":420,"pequena":140},
    "harmonização facial":{"capital":2800,"interior":980,"pequena":320},
    "clareamento dental":{"capital":2200,"interior":780,"pequena":255},
  };

  const estimateVolume = (term) => {
    const t = term.toLowerCase();
    // Remove cidade do termo para match
    const semCidade = t.replace(/(belo horizonte|são paulo|rio de janeiro|curitiba|porto alegre|salvador|fortaleza|recife|manaus|brasília|belém|goiânia|campinas|natal|teresina|campo grande|joão pessoa|aracaju|macapá|porto velho|boa vista|palmas|maceió|maceiÓ|florianópolis|vitória|são luís|cuiabá|bh|sp|rj)/gi,"").trim();
    
    // Classifica porte da cidade
    const capitais = ["belo horizonte","são paulo","rio de janeiro","curitiba","porto alegre","salvador","fortaleza","recife","manaus","brasília","bh","sp","rj"];
    const cidadeAtual = (form.cidade||"").toLowerCase();
    const porte = capitais.some(c=>cidadeAtual.includes(c))?"capital":cidadeAtual.length>0?"interior":"interior";
    
    // Busca match
    for(const [key, vals] of Object.entries(KW_VOLUMES)){
      if(semCidade.includes(key)||key.includes(semCidade)){
        const base = vals[porte];
        // Ajuste por cidade específica (adiciona variação)
        const variacao = Math.round(base * (0.85 + Math.random()*0.3));
        return variacao.toLocaleString("pt-BR");
      }
    }
    // Estimativa genérica
    const generic = porte==="capital"?Math.round(800+Math.random()*1200):Math.round(200+Math.random()*600);
    return generic.toLocaleString("pt-BR");
  };

  const addKw = (term) => {
    if(!term||kws.find(k=>k.term===term)) return;
    const volume = estimateVolume(term);
    setKws(p=>[...p,{term,volume,pos:""}]);
    setKwInput("");
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
      const msgContent = refPdfB64
        ? [{type:"document",source:{type:"base64",media_type:"application/pdf",data:refPdfB64}},{type:"text",text:`Use o PDF anexado como referência de contexto e estilo para enriquecer a escrita. Copywriter de marketing digital local.

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
{"tituloIntro":"máx 6 palavras","tituloAnalise":"máx 6 palavras","tituloConc":"máx 6 palavras","tituloIg":"máx 6 palavras","tituloProx":"máx 6 palavras","intro":"3-4 frases","problema":"3-4 frases","dados":"2-3 frases","diferenciais":"2-3 frases","igAnalise":"3-4 frases","proximos":"3-4 frases"}`}]
        : [{type:"text",text:`Copywriter de marketing digital local.

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
{"tituloIntro":"máx 6 palavras","tituloAnalise":"máx 6 palavras","tituloConc":"máx 6 palavras","tituloIg":"máx 6 palavras","tituloProx":"máx 6 palavras","intro":"3-4 frases","problema":"3-4 frases","dados":"2-3 frases","diferenciais":"2-3 frases","igAnalise":"3-4 frases","proximos":"3-4 frases"}`}];
      const resp=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1800,messages:[{role:"user",content:msgContent}]})});
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
    const html=buildPDF({form,ig,kws,concs,logoUrl,textos:txAtual(),temDadosGoogle,temConcs,temIG,layout:layoutPDF});
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
              ?<img src={logoUrl} style={{height:"80px",width:"80px",objectFit:"cover",display:"block",margin:"0 auto",borderRadius:"16px"}}/>
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
          {(p2modo==="auto"
              ?[{n:1,g:"Auto IA",l:"Diagnóstico IA"},{n:8,g:"Saída",l:"Editar & PDF"}]
              :[{n:1,g:"Negócio",l:"Segmento & Dados"},{n:2,g:"Negócio",l:"Métricas Google"},{n:3,g:"Negócio",l:"Palavras-chave"},{n:4,g:"Análise",l:"Concorrentes"},{n:5,g:"Análise",l:"Instagram"},{n:6,g:"Design",l:"Cores & Logo"},{n:7,g:"Design",l:"Consultor"},{n:8,g:"Saída",l:"Editar & PDF"}]
            ).map(({n,l,g},i,arr)=>{
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

        {/* ═══ AUTO IA — Página única ═══ */}
        {pg===1&&p2modo==="auto"&&<div>
          <div style={{...css.card(),background:"#0D0B12",border:`.5px solid ${form.cor1}22`,marginBottom:"16px",padding:"24px 28px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"8px"}}>
              <div style={{width:"36px",height:"36px",borderRadius:"10px",background:form.cor1+"22",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={form.cor1} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
              </div>
              <div>
                <div style={{fontSize:"15px",fontWeight:700,color:"#fff"}}>Diagnóstico Automático</div>
                <div style={{fontSize:"12px",color:"#555"}}>Preencha os links e a IA faz o resto</div>
              </div>
            </div>
          </div>

          {/* LINKS */}
          <div style={css.card()}>
            <div style={css.sec}>Links do negócio</div>
            <div style={{marginBottom:"12px"}}>
              <label style={css.lbl}>Link da ficha Google Maps *</label>
              <div style={{display:"flex",gap:"8px"}}>
                <input style={css.inp} value={form.fichaUrl} onChange={e=>setF("fichaUrl",e.target.value)} placeholder="https://maps.google.com/place/..."/>
                <button onClick={extrairFicha} disabled={fichaLoad} style={{...css.btn(form.cor1,"#fff"),whiteSpace:"nowrap",opacity:fichaLoad?.7:1,fontSize:"12px",padding:"9px 16px"}}>
                  {fichaLoad?"Buscando...":"Extrair"}
                </button>
              </div>
              {form.nome&&<div style={{marginTop:"8px",padding:"8px 12px",background:"#DCFCE7",borderRadius:"8px",fontSize:"12px",color:"#166534",fontWeight:600}}>✓ {form.nome} · {form.nota}★ · {form.numAvals} avaliações</div>}
            </div>
            <div>
              <label style={css.lbl}>Perfil do Instagram <span style={{fontWeight:400,color:T.n400,textTransform:"none",letterSpacing:0}}>(opcional)</span></label>
              <div style={{display:"flex",gap:"8px"}}>
                <input style={css.inp} value={ig.url} onChange={e=>setIG("url",e.target.value)} placeholder="https://instagram.com/perfil ou @handle"/>
                <button onClick={extrairIG} disabled={igLoad} style={{...css.btn(T.n700,"#fff"),whiteSpace:"nowrap",opacity:igLoad?.7:1,fontSize:"12px",padding:"9px 16px",border:`.5px solid ${T.n300}`}}>
                  {igLoad?"Analisando...":"Analisar"}
                </button>
              </div>
              {ig.handle&&<div style={{marginTop:"8px",padding:"8px 12px",background:"#DCFCE7",borderRadius:"8px",fontSize:"12px",color:"#166534",fontWeight:600}}>✓ @{ig.handle} · {ig.seguidores} seguidores</div>}
            </div>
          </div>

          {/* TOM */}
          <div style={css.card()}>
            <div style={css.sec}>Tom de comunicação</div>
            {Object.entries(TONS).map(([k,v])=>(
              <div key={k} onClick={()=>setF("tom",k)} style={{display:"flex",alignItems:"center",gap:"12px",padding:"11px 14px",borderRadius:"10px",border:form.tom===k?`1.5px solid ${form.cor1}`:`.5px solid ${T.n200}`,background:form.tom===k?form.cor1+"0d":T.n0,cursor:"pointer",marginBottom:"7px",transition:"all .12s"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:"13px",fontWeight:700,color:form.tom===k?form.cor1:T.n900}}>{v.label}</div>
                  <div style={{fontSize:"11px",color:T.n400,marginTop:"2px"}}>{v.desc}</div>
                </div>
                {form.tom===k&&<div style={{width:"8px",height:"8px",borderRadius:"50%",background:form.cor1,flexShrink:0}}/>}
              </div>
            ))}
          </div>

          {/* CORES & LOGO */}
          <div style={css.card()}>
            <div style={css.sec}>Identidade visual</div>
            <div style={{display:"flex",gap:"16px",alignItems:"center",marginBottom:"14px",flexWrap:"wrap"}}>
              <div style={{display:"flex",gap:"7px",flexWrap:"wrap"}}>
                {[["#C9A84C","#0D0D0B"],["#0F4FD1","#0D0D0B"],["#0D9488","#0D0D0B"],["#7C3AED","#0D0D0B"],["#DC2626","#0D0D0B"],["#0891B2","#0D0D0B"]].map(([c1,c2],i)=>(
                  <div key={i} onClick={()=>setForm(f=>({...f,cor1:c1,cor2:c2}))} style={{width:"26px",height:"26px",borderRadius:"50%",background:c1,cursor:"pointer",border:form.cor1===c1?`3px solid #0a0a0a`:`2px solid transparent`,transform:form.cor1===c1?"scale(1.2)":"scale(1)",transition:".12s"}}/>
                ))}
                <input type="color" value={form.cor1} onChange={e=>setForm(f=>({...f,cor1:e.target.value}))} style={{width:"26px",height:"26px",border:"none",borderRadius:"50%",cursor:"pointer",padding:0}}/>
              </div>
            </div>
            <div onClick={()=>logoRef.current?.click()} style={{border:`.5px dashed ${T.n300}`,borderRadius:"10px",padding:"14px",textAlign:"center",cursor:"pointer",background:T.n50}}>
              {logoUrl
                ?<img src={logoUrl} style={{height:"60px",width:"60px",objectFit:"cover",borderRadius:"12px",display:"block",margin:"0 auto"}}/>
                :<div style={{fontSize:"12px",color:T.n400}}>Upload da logo <span style={{color:T.n300}}>(clique)</span></div>
              }
            </div>
            <input ref={logoRef} type="file" accept="image/*" style={{display:"none"}} onChange={loadLogo}/>
          </div>

          {/* CONSULTOR */}
          <div style={css.card()}>
            <div style={css.sec}>Dados do consultor</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"10px"}}>
              <div><label style={css.lbl}>Seu nome</label><input style={css.inp} value={form.cslNome} onChange={e=>setF("cslNome",e.target.value)} placeholder="Nathan"/></div>
              <div><label style={css.lbl}>Empresa</label><input style={css.inp} value={form.cslEmpresa} onChange={e=>setF("cslEmpresa",e.target.value)} placeholder="SCentral"/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
              <div><label style={css.lbl}>WhatsApp</label><input style={css.inp} value={form.cslWhats} onChange={e=>setF("cslWhats",e.target.value)} placeholder="(37) 9 9999-9999"/></div>
              <div><label style={css.lbl}>Instagram</label><input style={css.inp} value={form.cslInsta} onChange={e=>setF("cslInsta",e.target.value)} placeholder="scentral.ia"/></div>
            </div>
          </div>

          {/* BOTÃO GERAR */}
          <SBar/>
          <button onClick={async()=>{
            // Busca concorrentes automaticamente se tiver localização
            if(form.placeLat&&form.placeLng&&concs.length===0){
              await buscarConcs();
            }
            await gerarTextoIA();
            setPg(8);
          }} disabled={loading||fichaLoad} style={{...css.btn(form.cor1,"#fff"),width:"100%",padding:"14px",fontSize:"14px",fontWeight:700,borderRadius:"12px",opacity:(loading||fichaLoad)?.7:1}}>
            {loading?"Gerando diagnóstico...":fichaLoad?"Carregando ficha...":"✦ Gerar diagnóstico completo"}
          </button>
        </div>}

      {/* P1 — Segmento & Dados (MANUAL) */}
        {pg===1&&p2modo==="manual"&&<div>
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

          <div style={css.card()}>
            <div style={css.sec}>Segmento</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(88px,1fr))",gap:"7px",marginBottom:"14px"}}>
              {Object.entries(NICHOS).map(([k,v])=>(
                <div key={k} onClick={()=>setNicho(k)} style={{padding:"10px 6px",borderRadius:"9px",border:nichoKey===k?`1.5px solid ${form.cor1}`:`.5px solid ${T.n200}`,background:nichoKey===k?form.cor1+"12":T.n0,cursor:"pointer",textAlign:"center",transition:"all .12s"}}>
                  <div style={{fontSize:"11px",fontWeight:600,color:nichoKey===k?form.cor1:T.n600}}>{v.label}</div>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"14px"}}>
              <div><label style={css.lbl}>Categoria</label><input style={css.inp} value={form.categoria} onChange={e=>setF("categoria",e.target.value)} placeholder="Ex: Clínica Médica"/></div>
              <div><label style={css.lbl}>Especialização</label><input style={css.inp} value={form.especializacao||""} onChange={e=>setF("especializacao",e.target.value)} placeholder="Ex: Ortopedia, Varizes..."/></div>
            </div>
            <div style={css.sec}>Dados do negócio</div>
            <div style={{marginBottom:"10px"}}><label style={css.lbl}>Nome *</label><input style={css.inp} value={form.nome} onChange={e=>setF("nome",e.target.value)} placeholder="Ex: Clínica Dra. Marina"/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 80px",gap:"12px",marginBottom:"10px"}}>
              <div><label style={css.lbl}>Cidade *</label><input style={css.inp} value={form.cidade} onChange={e=>setF("cidade",e.target.value)} placeholder="Belo Horizonte"/></div>
              <div><label style={css.lbl}>UF</label><input style={css.inp} value={form.estado||""} onChange={e=>setF("estado",e.target.value)} placeholder="MG"/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
              <div><label style={css.lbl}>Site</label><input style={css.inp} value={form.site||""} onChange={e=>setF("site",e.target.value)} placeholder="https://site.com.br"/></div>
              <div><label style={css.lbl}>WhatsApp</label><input style={css.inp} value={form.whatsapp||""} onChange={e=>setF("whatsapp",e.target.value)} placeholder="(31) 9 9999-9999"/></div>
            </div>
          </div>
          {/* Referência de diagnóstico */}
          <div style={{marginBottom:"14px"}}>
            <button onClick={()=>setShowRef(s=>!s)} style={{display:"flex",alignItems:"center",gap:"8px",padding:"10px 16px",borderRadius:"10px",border:`.5px solid ${showRef||refPdfName?form.cor1:T.n300}`,background:showRef||refPdfName?form.cor1+"0d":T.n0,cursor:"pointer",fontSize:"12px",fontWeight:600,color:showRef||refPdfName?form.cor1:T.n600,width:"100%",justifyContent:"space-between",transition:"all .15s"}}>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                {refPdfName?"Referência: "+refPdfName:"Usar diagnóstico anterior como referência"}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"4px",fontSize:"10px",color:T.n400}}>
                {refPdfName?<span style={{color:"#16A34A",fontWeight:700}}>✓ Carregado</span>:<span>opcional</span>}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points={showRef?"18 15 12 9 6 15":"6 9 12 15 18 9"}/></svg>
              </div>
            </button>
            {showRef&&(
              <div style={{marginTop:"8px",padding:"16px",background:T.n50,borderRadius:"10px",border:`.5px solid ${T.n200}`}}>
                <div style={{fontSize:"12px",color:T.n600,marginBottom:"12px",lineHeight:1.6}}>
                  Faça upload de um PDF de diagnóstico anterior. Ele será usado como <strong>referência de contexto</strong> para enriquecer os textos gerados — sem substituir a análise atual.
                </div>
                <label style={{display:"flex",alignItems:"center",gap:"10px",padding:"12px 14px",border:`.5px dashed ${T.n300}`,borderRadius:"8px",cursor:"pointer",background:T.n0}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.n400} strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <div>
                    <div style={{fontSize:"12px",fontWeight:600,color:T.n700}}>{refPdfName||"Clique para selecionar o PDF"}</div>
                    <div style={{fontSize:"11px",color:T.n400,marginTop:"2px"}}>Apenas arquivos .pdf</div>
                  </div>
                  <input type="file" accept=".pdf" style={{display:"none"}} onChange={e=>{
                    const f=e.target.files[0];
                    if(!f)return;
                    setRefPdfName(f.name);
                    const r=new FileReader();
                    r.onload=ev=>{
                      const b64=ev.target.result.split(",")[1];
                      setRefPdfB64(b64);
                    };
                    r.readAsDataURL(f);
                  }}/>
                </label>
                {refPdfName&&(
                  <button onClick={()=>{setRefPdfName("");setRefPdfB64("");}} style={{marginTop:"8px",background:"none",border:"none",cursor:"pointer",fontSize:"11px",color:T.n400}}>Remover referência</button>
                )}
              </div>
            )}
          </div>
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
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px",marginBottom:"14px"}}>
              <div><label style={css.lbl}>Nº avaliações</label><input style={css.inp} type="number" value={form.numAvals} onChange={e=>setF("numAvals",e.target.value)} placeholder="—"/></div>
              <div><label style={css.lbl}>Fotos Google</label><input style={css.inp} type="number" value={form.numFotos} onChange={e=>setF("numFotos",e.target.value)} placeholder="—"/></div>
              <div><label style={css.lbl}>Posição ranking</label><input style={css.inp} type="number" value={form.posicao} onChange={e=>setF("posicao",e.target.value)} placeholder="—"/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"10px"}}>
              <div>
                <div style={css.sec}>Presença na ficha</div>
                {[{k:"temSite",l:"Site ativo?"},{k:"temWhats",l:"WhatsApp na ficha?"},{k:"postsAtivos",l:"Posts ativos?"}].map(({k,l})=>(
                  <div key={k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"8px"}}>
                    <span style={{fontSize:"12px",color:T.n700}}>{l}</span>
                    <div style={{display:"flex",borderRadius:"6px",overflow:"hidden",border:`.5px solid ${T.n200}`}}>
                      <button onClick={()=>setF(k,true)} style={{padding:"4px 14px",fontSize:"11px",fontWeight:700,cursor:"pointer",border:"none",background:form[k]===true?"#16A34A":"transparent",color:form[k]===true?"#fff":T.n400,transition:"all .15s"}}>SIM</button>
                      <button onClick={()=>setF(k,false)} style={{padding:"4px 14px",fontSize:"11px",fontWeight:700,cursor:"pointer",border:"none",background:form[k]===false?"#DC2626":"transparent",color:form[k]===false?"#fff":T.n400,transition:"all .15s"}}>NÃO</button>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <div style={css.sec}>Frequência de posts</div>
                {[["nenhuma","Nenhuma"],["raramente","Raramente"],["mensal","Mensal"],["semanal","Semanal"],["diaria","Diária"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setF("frequencia",v)} style={{display:"block",width:"100%",textAlign:"left",padding:"6px 10px",marginBottom:"4px",borderRadius:"7px",border:`.5px solid ${form.frequencia===v?form.cor1:T.n200}`,background:form.frequencia===v?form.cor1+"12":T.n0,fontSize:"12px",fontWeight:form.frequencia===v?700:400,color:form.frequencia===v?form.cor1:T.n600,cursor:"pointer",transition:"all .12s"}}>
                    {l}
                  </button>
                ))}
              </div>
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
            <p style={{fontSize:"12px",color:T.n400,marginBottom:"12px",lineHeight:1.6}}>Adicione os termos que seus clientes buscam. O sistema estima o volume de buscas na sua cidade e você informa a posição atual do negócio.</p>
            <div style={{display:"flex",gap:"8px",marginBottom:"12px"}}>
              <input style={css.inp} value={kwInput} onChange={e=>setKwInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&kwInput.trim()){addKw(kwInput.trim());e.preventDefault();}}}
                placeholder="ex: ortopedista belo horizonte"/>
              <button onClick={()=>addKw(kwInput.trim())} style={{...css.btn(form.cor1,"#fff"),padding:"9px 14px",fontSize:"12px",whiteSpace:"nowrap"}}>+ Add</button>
            </div>

            {kws.length>0&&(
              <div style={{marginBottom:"14px"}}>
                {kws.map((kw,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 12px",background:T.n50,borderRadius:"9px",border:`.5px solid ${T.n200}`,marginBottom:"6px"}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"13px",fontWeight:600,color:T.n900,marginBottom:"2px"}}>{kw.term}</div>
                      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                        {kw.volume&&<span style={{fontSize:"11px",color:T.n400}}>
                          <span style={{fontWeight:700,color:form.cor1}}>{kw.volume}</span> buscas/mês est.
                        </span>}
                        {kw.volume&&<span style={{fontSize:"10px",color:T.n400}}>em {form.cidade||"sua cidade"}</span>}
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:"8px",flexShrink:0}}>
                      <div>
                        <div style={{fontSize:"10px",color:T.n400,marginBottom:"3px",textAlign:"center"}}>Posição</div>
                        <input
                          type="number" min="1" max="100"
                          value={kw.pos||""}
                          onChange={e=>{
                            const updated=[...kws];
                            updated[i]={...updated[i],pos:e.target.value};
                            setKws(updated);
                          }}
                          placeholder="—"
                          style={{...css.inp,width:"52px",textAlign:"center",padding:"5px 6px",fontSize:"12px",fontWeight:700}}
                        />
                      </div>
                      <span onClick={()=>setKws(p=>p.filter((_,j)=>j!==i))} style={{cursor:"pointer",color:T.n300,fontSize:"18px",lineHeight:1,marginTop:"14px"}}>×</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={css.sec}>Sugestões</div>
            <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
              {[...new Set([
                ...(NICHOS[nichoKey]?.kws||[]).map(k=>k+" "+(form.cidade||"cidade")),
                `${form.categoria||"negócio"} ${form.cidade||"cidade"}`,
                `${form.especializacao||""} ${form.cidade||""}`.trim(),
              ].filter(Boolean))].slice(0,8).map(sg=>(
                <button key={sg} onClick={()=>addKw(sg)}
                  style={{...css.btnSm(kws.find(k=>k.term===sg)?form.cor1+"18":T.n0, kws.find(k=>k.term===sg)?form.cor1:T.n600, `.5px solid ${kws.find(k=>k.term===sg)?form.cor1:T.n200}`)}}>{sg}</button>
              ))}
            </div>
          </div>
          <div style={{display:"flex",gap:"10px",justifyContent:"space-between"}}><Nav label="← Voltar" to={2} back/><Nav label="Próximo →" to={4}/></div>
        </div>}

        {/* P4 — Concorrentes (OPCIONAL) */}
        {pg===4&&<div>
          {p2modo==="manual"&&<div style={{...css.card(T.n50),border:`.5px solid ${T.n200}`,marginBottom:"10px",padding:"16px 20px"}}>
            <div style={{fontSize:"13px",fontWeight:700,color:T.n900,marginBottom:"4px"}}>Análise de concorrentes</div>
            <div style={{fontSize:"12px",color:T.n400,lineHeight:1.6}}>Disponível no modo <strong>Auto IA</strong>. Ative o modo Auto IA na sidebar para buscar concorrentes automaticamente pelo Google Maps.</div>
          </div>}
          {p2modo==="auto"&&<div style={{...css.card(T.goldL),border:`.5px solid ${T.goldM}`,marginBottom:"10px"}}>
            <div style={{fontSize:"12px",color:T.gold,fontWeight:600,display:"flex",alignItems:"center",gap:"6px"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Seção opcional — sem concorrentes, a página não será gerada no PDF
            </div>
          </div>}
          {p2modo==="auto"&&<div style={css.card()}>
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
          </div>}
          {p2modo==="auto"&&temConcs&&(
            <div style={css.card()}>
              <div style={css.sec}>Mapa de posicionamento</div>
              <div style={{borderRadius:"10px",overflow:"hidden",border:`.5px solid ${T.n200}`}} dangerouslySetInnerHTML={{__html:mapHtml}}/>
            </div>
          )}
          {p2modo==="manual"&&<div style={{...css.card(T.n50),border:`.5px solid ${T.n200}`}}>
            <div style={{fontSize:"12px",color:T.n400,textAlign:"center",padding:"8px 0"}}>Alterne para <strong style={{color:form.cor1}}>Auto IA</strong> para buscar e mapear concorrentes automaticamente.</div>
          </div>}
          {p2modo==="auto"&&<div style={css.card()}>
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
          </div>}
          <div style={{display:"flex",gap:"10px",justifyContent:"space-between"}}><Nav label="← Voltar" to={3} back/><Nav label="Próximo →" to={5}/></div>
        </div>}

        {/* P5 — Instagram (OPCIONAL) */}
        {pg===5&&<div>
          <div style={{...css.card(T.goldL),border:`.5px solid ${T.goldM}`,marginBottom:"10px"}}>
            <div style={{fontSize:"12px",color:T.gold,fontWeight:600,display:"flex",alignItems:"center",gap:"6px"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Seção opcional — sem dados do Instagram, a página não será gerada no PDF
            </div>
          </div>

          {/* Auto IA */}
          {p2modo==="auto"&&<div style={css.card()}>
            <div style={{fontSize:"13px",fontWeight:700,marginBottom:"4px",display:"flex",alignItems:"center",gap:"8px"}}>
              Analisar Instagram
              <span style={{background:"linear-gradient(90deg,#7C3AED,#4F46E5)",color:"#fff",fontSize:"10px",padding:"2px 8px",borderRadius:"20px",fontWeight:700}}>IA</span>
            </div>
            <div style={{display:"flex",gap:"8px",marginBottom:"12px"}}>
              <input style={css.inp} value={ig.url} onChange={e=>setIG("url",e.target.value)} placeholder="https://instagram.com/perfil"/>
              <button onClick={extrairIG} disabled={igLoad} style={{...css.btn(form.cor1,"#fff"),whiteSpace:"nowrap",opacity:igLoad?.7:1,fontSize:"12px",padding:"9px 14px"}}>
                {igLoad?"Analisando...":"Analisar"}
              </button>
            </div>
            <SBar/>
          </div>}

          {/* Dados do perfil */}
          <div style={css.card()}>
            <div style={css.sec}>Dados do perfil</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"14px"}}>
              <div><label style={css.lbl}>Handle (sem @)</label><input style={css.inp} value={ig.handle} onChange={e=>setIG("handle",e.target.value)} placeholder="perfil"/></div>
              <div><label style={css.lbl}>Seguidores</label><input style={css.inp} value={ig.seguidores} onChange={e=>setIG("seguidores",e.target.value)} placeholder="1.240"/></div>
            </div>
            <label style={css.lbl}>Print do perfil <span style={{fontWeight:400,color:T.n400,textTransform:"none",letterSpacing:0,fontSize:"11px"}}>(opcional)</span></label>
            <PasteImage value={ig.printUrl||""} onChange={v=>setIG("printUrl",v)} label="Cole o print do Instagram aqui (Ctrl+V)" hint="Aparecerá na página de Instagram do PDF"/>
          </div>

          {/* Critérios SIM/NÃO */}
          <div style={css.card()}>
            <div style={css.sec}>Critérios de presença</div>
            <p style={{fontSize:"12px",color:T.n400,marginBottom:"14px"}}>Marque cada critério. Os itens negativos geram críticas automáticas adaptadas ao tom selecionado.</p>
            {IG_CRITERIOS.map(({k,label,critica,criticaPositiva})=>{
              const val = ig[k];
              const mostrarCritica = criticaPositiva ? val===true : val===false;
              const tom = form.tom||"original";
              return(
                <div key={k} style={{marginBottom:"12px",paddingBottom:"12px",borderBottom:`.5px solid ${T.n100}`}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"6px"}}>
                    <span style={{fontSize:"13px",fontWeight:600,color:T.n900}}>{label}</span>
                    <div style={{display:"flex",borderRadius:"6px",overflow:"hidden",border:`.5px solid ${T.n200}`}}>
                      <button onClick={()=>setIG(k,true)} style={{padding:"5px 16px",fontSize:"11px",fontWeight:700,cursor:"pointer",border:"none",background:val===true?"#16A34A":"transparent",color:val===true?"#fff":T.n400,transition:"all .15s"}}>SIM</button>
                      <button onClick={()=>setIG(k,false)} style={{padding:"5px 16px",fontSize:"11px",fontWeight:700,cursor:"pointer",border:"none",background:val===false?"#DC2626":"transparent",color:val===false?"#fff":T.n400,transition:"all .15s"}}>NÃO</button>
                    </div>
                  </div>
                  {mostrarCritica&&critica[tom]&&(
                    <div style={{padding:"10px 13px",background:T.errBg,borderLeft:`3px solid #DC2626`,borderRadius:"0 8px 8px 0",fontSize:"12px",color:"#7F1D1D",lineHeight:1.6}}>
                      {critica[tom]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

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
            {/* Seletor de layout */}
            <div style={{marginBottom:"16px"}}>
              <div style={css.sec}>Layout do relatório</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"8px"}}>
                {[
                  {id:"basico",label:"Básico",desc:"Notion + Stripe",cor:"#2563EB"},
                  {id:"premium",label:"Premium",desc:"McKinsey + Apple",cor:"#C9A227"},
                  {id:"luxo",label:"Luxo",desc:"Louis Vuitton + Rolex",cor:"#D4AF37"},
                  {id:"relatorio",label:"Relatório",desc:"PwC + KPMG",cor:"#0B1F3A"},
                  {id:"custom",label:"Custom",desc:"Cor da marca",cor:form.cor1},
                ].map(({id,label,desc,cor})=>(
                  <div key={id} onClick={()=>setLayoutPDF(id)}
                    style={{padding:"10px 8px",borderRadius:"10px",border:layoutPDF===id?`2px solid ${cor}`:`.5px solid ${T.n200}`,background:layoutPDF===id?cor+"10":T.n0,cursor:"pointer",textAlign:"center",transition:"all .12s"}}>
                    <div style={{width:"20px",height:"20px",borderRadius:"50%",background:cor,margin:"0 auto 6px"}}/>
                    <div style={{fontSize:"11px",fontWeight:700,color:layoutPDF===id?cor:T.n900}}>{label}</div>
                    <div style={{fontSize:"9px",color:T.n400,marginTop:"2px",lineHeight:1.3}}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>
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
function buildPDF({form,ig,kws,concs,logoUrl,textos,temDadosGoogle,temConcs,temIG,layout="custom"}) {
  const c1=form.cor1||T.gold, c2=form.cor2||T.dark;
  const empresa=form.cslEmpresa||"SCentral";
  const t=textos;
  const n=NICHOS[form.nichoKey]||NICHOS.outro;
  const wUrl=waLink(form.cslWhats);

  // Shared helpers
  const logoHtml=logoUrl
    ?`<img src="${logoUrl}" style="height:48px;width:48px;object-fit:cover;border-radius:12px;display:block"/>`
    :`<img src="${LOGO_B64}" style="height:48px;width:auto;object-fit:contain;display:block;filter:brightness(10)"/>`;
  const qrHtml=wUrl?`<img src="${qrUrl(wUrl)}" width="100" height="100" style="border-radius:10px;display:block"/>`:""

  const scoreCritsData=[
    {l:"Nota Google",pts:Math.round(Math.min((parseFloat(form.nota)||0)/5*25,25)),max:25},
    {l:"Avaliações",pts:Math.round(Math.min((parseInt(form.numAvals)||0)/200*20,20)),max:20},
    {l:"Fotos",pts:Math.round(Math.min((parseInt(form.numFotos)||0)/20*15,15)),max:15},
    {l:"Site ativo",pts:form.temSite?10:0,max:10},
    {l:"WhatsApp",pts:form.temWhats?10:0,max:10},
    {l:"Posts",pts:form.postsAtivos?10:0,max:10},
    {l:"Frequência",pts:{nenhuma:0,raramente:3,mensal:5,semanal:8,diaria:10}[form.frequencia]||0,max:10},
  ];

  const igCriticasHtml=(()=>{
    const tom=form.tom||"original";
    return IG_CRITERIOS
      .filter(c=>{const v=ig[c.k];return c.criticaPositiva?v===true:v===false;})
      .map(c=>`<div style="margin-bottom:10px;padding:10px 14px;background:#FEE2E2;border-left:3px solid #EF4444;border-radius:0 8px 8px 0"><div style="font-size:11px;font-weight:700;color:#991B1B;margin-bottom:4px">${c.label}</div><p style="font-size:12px;color:#7F1D1D;line-height:1.65;margin:0">${c.critica[tom]||c.critica.original}</p></div>`)
      .join("");
  })();

  const kwPageHtml=(kws||[]).length>0?`<div class="pg"><div class="accent"></div><div class="body"><div class="label" style="margin-bottom:8px">Visibilidade de busca</div><h1 style="margin-bottom:14px">Oportunidades de pesquisa</h1><p style="max-width:460px;margin-bottom:28px">${n.cliente}s buscam por <strong>${form.categoria}</strong> em <strong>${form.cidade}</strong>. Veja onde você está posicionado.</p><div class="card">${(kws||[]).map((kw,i)=>{const term=kw.term||kw;const vol=kw.volume||"—";const pos=kw.pos;const posNum=parseInt(pos);const posColor=posNum<=3?"#16A34A":posNum<=10?"#F59E0B":"#EF4444";return`<div style="display:flex;align-items:center;gap:16px;padding:12px 0;border-bottom:1px solid #f5f5f5${i===(kws.length-1)?";border:none":""}"><div style="flex:1"><div style="font-size:13px;font-weight:600;color:#111">${term}</div><div style="font-size:11px;color:#aaa;margin-top:2px"><span style="font-weight:700;color:#2563EB">${vol}</span> buscas/mês em ${form.cidade||"sua cidade"}</div></div>${pos?`<div style="text-align:right"><div style="font-size:18px;font-weight:800;color:${posColor}">#${pos}</div><div style="font-size:10px;color:${posColor};font-weight:600">${posNum<=3?"Top 3":posNum<=10?"Página 1":"Página "+Math.ceil(posNum/10)}</div></div>`:`<div style="font-size:11px;color:#ccc">Não rastreado</div>`}</div>`;}).join("")}</div></div></div>`:"";

  const mapSVG=temConcs?makeMapStatic({concs,cidade:form.cidade||"Cidade",nome:form.nome||"Negócio",cor1:c1}):"";
  const concRows=temConcs?concs.slice(0,5).map((c,i)=>`<div style="display:flex;align-items:center;gap:14px;padding:11px 0;border-bottom:1px solid #f5f5f5"><div style="width:26px;height:26px;border-radius:50%;background:${i===0?"#EF4444":i===1?"#F59E0B":"#94A3B8"};color:#fff;font-weight:800;font-size:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${c.posicao||i+1}</div><div style="flex:1"><div style="font-size:12px;font-weight:600;color:#111">${c.nome}</div>${c.diferencial?`<div style="font-size:11px;color:#999">${c.diferencial}</div>`:""}</div><div style="text-align:right;font-size:12px;font-weight:700;color:#111">${c.nota}★<div style="font-size:10px;color:#aaa;font-weight:400">${c.avals}</div></div></div>`).join(""):"";

  const gaugeSVG=(()=>{
    const sc=Math.max(0,Math.min(100,parseInt(form.score)||0));
    const rad=(-180+(sc/100)*180)*Math.PI/180;
    const nx=(110+80*Math.cos(rad)).toFixed(1);const ny=(105+80*Math.sin(rad)).toFixed(1);
    const col=sc<40?"#EF4444":sc<70?"#F59E0B":c1;
    return`<svg width="160" height="100" viewBox="0 0 220 135" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="gg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#EF4444"/><stop offset="40%" stop-color="#F59E0B"/><stop offset="100%" stop-color="${c1}"/></linearGradient></defs><path d="M30 105 A80 80 0 0 1 190 105" fill="none" stroke="#f0f0f0" stroke-width="14" stroke-linecap="round"/><path d="M30 105 A80 80 0 0 1 190 105" fill="none" stroke="url(#gg)" stroke-width="14" stroke-linecap="round"/><line x1="110" y1="105" x2="${nx}" y2="${ny}" stroke="#111" stroke-width="3" stroke-linecap="round"/><circle cx="110" cy="105" r="5" fill="#111"/><text x="110" y="130" font-size="24" font-weight="800" fill="${col}" text-anchor="middle" font-family="sans-serif">${sc}</text></svg>`;
  })();

  let pgCur=0;
  let pgTotal=1+((kws||[]).length>0?1:0)+(temDadosGoogle?1:0)+(temConcs?1:0)+(temIG?1:0)+1;
  const pgNum=(accent="#7C3AED",bg="#fff")=>{ pgCur++;
    return`<div style="display:flex;align-items:center;justify-content:space-between;margin-top:auto;padding-top:20px;border-top:1px solid ${bg==="#fff"?"#f0f0f0":"rgba(255,255,255,.1)"}"><span style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:${bg==="#fff"?accent:"rgba(255,255,255,.4)"}">${empresa}</span><span style="font-size:10px;color:${bg==="#fff"?"#aaa":"rgba(255,255,255,.3)"}">${String(pgCur).padStart(2,"0")} / ${String(pgTotal).padStart(2,"0")}</span></div>`;
  };

  // ═══════════════════════════════════════════════════════
  // MODELO 1 — BÁSICO (Notion + Google Docs + Stripe)
  // ═══════════════════════════════════════════════════════
  if(layout==="basico") {
    const B={bg:"#F8FAFC",text:"#0F172A",muted:"#64748B",border:"#E2E8F0",accent:"#2563EB",card:"#FFFFFF"};
    const scoreBars=scoreCritsData.map(({l,pts,max})=>`<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px"><div style="width:130px;font-size:11px;color:${B.muted};flex-shrink:0">${l}</div><div style="flex:1;height:6px;background:${B.border};border-radius:3px"><div style="height:100%;width:${(pts/max)*100}%;background:${pts===max?"#16A34A":pts>0?B.accent:B.border};border-radius:3px"></div></div><div style="font-size:11px;font-weight:700;color:${B.text};width:36px;text-align:right">${pts}/${max}</div></div>`).join("");
    return`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>Diagnóstico — ${form.nome}</title>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:#fff;color:${B.text};-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg{width:210mm;min-height:297mm;padding:48px;page-break-after:always;display:flex;flex-direction:column;background:#fff}
.pg:last-child{page-break-after:avoid}
h1{font-family:'Montserrat',sans-serif;font-size:26px;font-weight:800;color:${B.text};letter-spacing:-.3px;line-height:1.2}
h2{font-family:'Montserrat',sans-serif;font-size:18px;font-weight:700;color:${B.text};margin-bottom:16px}
h3{font-family:'Montserrat',sans-serif;font-size:13px;font-weight:600;color:${B.text}}
p{font-size:13px;color:${B.muted};line-height:1.75}
.label{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:${B.accent};margin-bottom:8px;font-family:'Montserrat',sans-serif}
.card{background:${B.card};border:1px solid ${B.border};border-radius:12px;padding:24px 28px;margin-bottom:20px}
.divider{height:1px;background:${B.border};margin:24px 0}
.chip{display:inline-block;background:${B.accent}12;color:${B.accent};border:1px solid ${B.accent}22;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;margin:2px 3px}
.obs{background:#EFF6FF;border-left:3px solid ${B.accent};padding:14px 18px;border-radius:0 8px 8px 0;margin:16px 0}
.check{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px}
@page{size:A4;margin:0}
</style></head><body>

<div class="pg">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:48px;padding-bottom:20px;border-bottom:1px solid ${B.border}">
    ${logoHtml}
    <div style="text-align:right"><div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:${B.accent};font-family:'Montserrat',sans-serif">Diagnóstico Digital</div><div style="font-size:11px;color:${B.muted};margin-top:2px">Presença Local — ${form.cidade||""}${form.estado?", "+form.estado:""}</div></div>
  </div>
  <div style="flex:1">
    <div class="label">${t.tituloIntro}</div>
    <h1 style="margin-bottom:8px">${form.nome||"Diagnóstico Digital"}</h1>
    <div style="font-size:14px;color:${B.muted};margin-bottom:32px">${form.categoria||""}${form.especializacao?" · "+form.especializacao:""}</div>
    <div class="card">
      <p style="font-size:14px;line-height:1.8;color:${B.text}">${t.intro}</p>
    </div>
    <div class="obs"><p style="color:${B.accent};font-weight:500">${t.problema}</p></div>
    ${(kws||[]).length>0?`<div style="margin-top:20px"><div class="label">Termos monitorados</div><div>${(kws||[]).map(k=>`<span class="chip">${k.term||k}</span>`).join("")}</div></div>`:""}
  </div>
  ${pgNum(B.accent)}
</div>

${kwPageHtml}

${temDadosGoogle?`
<div class="pg">
  <div class="label">${t.tituloAnalise}</div>
  <h2>Presença no Google</h2>
  <p style="margin-bottom:24px">${t.dados}</p>
  ${form.fichaScreenshot?`<div style="margin-bottom:20px;border-radius:10px;overflow:hidden;border:1px solid ${B.border}"><img src="${form.fichaScreenshot}" style="max-width:100%;max-height:160px;object-fit:contain;display:block;margin:0 auto"/></div>`:""}
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
    <div class="card" style="text-align:center">${gaugeSVG}<div style="font-size:11px;color:${B.muted};margin-top:4px">Score de presença</div></div>
    <div class="card">
      <div style="font-size:32px;font-weight:800;font-family:'Montserrat',sans-serif;color:${B.text}">${form.nota||"—"}<span style="font-size:14px;color:${B.muted};font-weight:400">/5.0</span></div>
      <div style="color:#F59E0B;font-size:14px;margin-bottom:12px">${"★".repeat(Math.floor(parseFloat(form.nota)||0))}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div><div style="font-size:16px;font-weight:700;color:${B.text}">${form.numAvals||"—"}</div><div style="font-size:10px;color:${B.muted}">Avaliações</div></div>
        <div><div style="font-size:16px;font-weight:700;color:${B.text}">${form.numFotos||"—"}</div><div style="font-size:10px;color:${B.muted}">Fotos</div></div>
        <div><div style="font-size:16px;font-weight:700;color:${B.accent}">#${form.posicao||"—"}</div><div style="font-size:10px;color:${B.muted}">Posição</div></div>
      </div>
    </div>
  </div>
  <div class="card">${scoreBars}</div>
  ${pgNum(B.accent)}
</div>`:""}

${temConcs?`
<div class="pg">
  <div class="label">${t.tituloConc}</div>
  <h2>Cenário competitivo</h2>
  <p style="margin-bottom:20px">${t.diferenciais}</p>
  <div style="border-radius:10px;overflow:hidden;border:1px solid ${B.border};margin-bottom:20px">${mapSVG}</div>
  <div class="card">${concRows}</div>
  ${pgNum(B.accent)}
</div>`:""}

${temIG?`
<div class="pg">
  <div class="label">${t.tituloIg}</div>
  <h2>Presença no Instagram</h2>
  ${ig.handle?`<div style="font-size:13px;font-weight:600;color:${B.accent};margin-bottom:16px">@${ig.handle}${ig.seguidores?" · "+ig.seguidores+" seguidores":""}</div>`:""}
  ${ig.printUrl?`<div style="margin-bottom:20px;border-radius:10px;overflow:hidden;border:1px solid ${B.border}"><img src="${ig.printUrl}" style="max-width:100%;max-height:180px;object-fit:contain;display:block"/></div>`:""}
  <div class="obs"><p>${t.igAnalise}</p></div>
  ${igCriticasHtml?`<div style="margin-top:16px">${igCriticasHtml}</div>`:""}
  ${pgNum(B.accent)}
</div>`:""}

<div class="pg">
  <div style="border:2px solid ${B.accent};border-radius:16px;padding:36px;flex:1;display:flex;flex-direction:column;justify-content:space-between">
    <div>
      <div class="label">${t.tituloProx}</div>
      <h1 style="margin-bottom:16px">Próximos passos</h1>
      <p style="font-size:14px;color:${B.text};line-height:1.8">${t.proximos}</p>
    </div>
    <div style="display:flex;align-items:center;gap:20px;padding:20px;background:${B.bg};border-radius:12px;margin-top:28px">
      ${qrHtml?`<div style="flex-shrink:0">${qrHtml}</div>`:""}
      <div>
        <div style="font-size:16px;font-weight:700;color:${B.text};font-family:'Montserrat',sans-serif">${form.cslNome||empresa}</div>
        <div style="font-size:12px;color:${B.accent};font-weight:600;margin-bottom:8px">${empresa}</div>
        ${form.cslWhats?`<div style="font-size:12px;color:${B.muted}">📱 ${form.cslWhats}</div>`:""}
        ${form.cslInsta?`<div style="font-size:12px;color:${B.muted}">@${form.cslInsta}</div>`:""}
      </div>
    </div>
  </div>
  ${pgNum(B.accent)}
</div>

</body></html>`;
  }

  // ═══════════════════════════════════════════════════════
  // MODELO 2 — PREMIUM (McKinsey + Deloitte + Apple)
  // ═══════════════════════════════════════════════════════
  if(layout==="premium") {
    const P={bg:"#F9F7F3",dark:"#111111",gold:"#C9A227",muted:"#6B7280",card:"#FFFFFF",border:"#E5E1D8"};
    const scoreBars=scoreCritsData.map(({l,pts,max})=>`<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:11px;color:${P.muted}">${l}</span><span style="font-size:11px;font-weight:700;color:${pts===max?"#16A34A":pts>0?P.gold:P.muted}">${pts}/${max}</span></div><div style="height:3px;background:${P.border};border-radius:2px"><div style="height:100%;width:${(pts/max)*100}%;background:${pts===max?"#16A34A":pts>0?P.gold:P.border};border-radius:2px"></div></div></div>`).join("");
    return`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>Diagnóstico — ${form.nome}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:#fff;color:${P.dark};-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg{width:210mm;min-height:297mm;padding:52px 56px;page-break-after:always;display:flex;flex-direction:column;background:#fff}
.pg:last-child{page-break-after:avoid}
.pg-dark{background:${P.dark}}
h1{font-family:'Playfair Display',serif;font-size:30px;font-weight:700;color:${P.dark};line-height:1.2;letter-spacing:-.2px}
h2{font-family:'Playfair Display',serif;font-size:22px;font-weight:600;color:${P.dark};margin-bottom:18px}
h3{font-family:'Montserrat',sans-serif;font-size:13px;font-weight:600;color:${P.dark}}
p{font-size:13px;color:${P.muted};line-height:1.8}
.label{font-size:9px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:${P.gold};margin-bottom:10px;font-family:'Montserrat',sans-serif}
.card{background:${P.card};border:1px solid ${P.border};border-radius:16px;padding:28px 32px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.gold-line{height:1px;background:linear-gradient(90deg,${P.gold},transparent);margin:28px 0}
.highlight{background:${P.bg};border-left:2px solid ${P.gold};padding:18px 22px;border-radius:0 10px 10px 0;margin:16px 0}
@page{size:A4;margin:0}
</style></head><body>

<div class="pg pg-dark" style="justify-content:space-between">
  <div style="display:flex;align-items:center;justify-content:space-between">
    ${logoHtml}
    <div style="font-size:9px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:${P.gold};font-family:'Montserrat',sans-serif">Diagnóstico Digital · Confidencial</div>
  </div>
  <div>
    <div style="font-size:9px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:${P.gold};font-family:'Montserrat',sans-serif;margin-bottom:20px">Análise Estratégica de Presença Digital</div>
    <h1 style="font-size:42px;color:#fff;margin-bottom:10px;line-height:1.05">${form.nome||"Diagnóstico"}</h1>
    ${form.categoria?`<div style="font-size:15px;color:#888;font-family:'Montserrat',sans-serif;letter-spacing:.02em">${form.categoria}${form.especializacao?" · "+form.especializacao:""}</div>`:""}
    ${form.cidade?`<div style="font-size:13px;color:#555;margin-top:6px">${form.cidade}${form.estado?", "+form.estado:""}</div>`:""}
  </div>
  <div style="display:flex;align-items:flex-end;justify-content:space-between">
    <div><div style="font-size:11px;color:#555;margin-bottom:4px;font-family:'Montserrat',sans-serif">Preparado por</div><div style="font-size:15px;font-weight:700;color:#fff;font-family:'Montserrat',sans-serif">${form.cslNome||empresa}</div><div style="font-size:12px;color:${P.gold};font-weight:600;font-family:'Montserrat',sans-serif">${empresa}</div></div>
    <div style="text-align:right"><div style="width:40px;height:1px;background:${P.gold};margin-left:auto;margin-bottom:6px"></div><div style="font-size:9px;color:#444;letter-spacing:.1em;text-transform:uppercase">Análise Premium</div></div>
  </div>
</div>

<div class="pg">
  <div class="label">${t.tituloIntro}</div>
  <h2 style="margin-bottom:8px">Resumo Executivo</h2>
  <div class="gold-line"></div>
  <div class="card"><p style="font-size:14px;color:${P.dark};line-height:1.85">${t.intro}</p></div>
  <div class="highlight"><p style="color:${P.dark};font-size:13px">${t.problema}</p></div>
  ${(kws||[]).length>0?`<div style="margin-top:20px"><div class="label">Termos estratégicos</div><div>${(kws||[]).map(k=>`<span style="display:inline-block;background:${P.gold}12;color:${P.gold};border:1px solid ${P.gold}33;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;margin:2px 3px;font-family:'Montserrat',sans-serif">${k.term||k}</span>`).join("")}</div></div>`:""}
  ${pgNum(P.gold)}
</div>

${kwPageHtml}

${temDadosGoogle?`
<div class="pg">
  <div class="label">${t.tituloAnalise}</div>
  <h2>Diagnóstico de Presença</h2>
  <div class="gold-line"></div>
  <p style="margin-bottom:24px">${t.dados}</p>
  ${form.fichaScreenshot?`<div style="margin-bottom:20px;border-radius:12px;overflow:hidden;border:1px solid ${P.border}"><img src="${form.fichaScreenshot}" style="max-width:100%;max-height:160px;object-fit:contain;display:block;margin:0 auto"/></div>`:""}
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:20px">
    <div class="card" style="text-align:center">${gaugeSVG}<div style="font-size:11px;color:${P.muted};margin-top:4px;font-family:'Montserrat',sans-serif">Score de presença</div></div>
    <div class="card">
      <div style="font-size:34px;font-weight:700;font-family:'Playfair Display',serif;color:${P.dark}">${form.nota||"—"}<span style="font-size:16px;color:${P.muted};font-weight:400">/5.0</span></div>
      <div style="color:#F59E0B;margin-bottom:12px">${"★".repeat(Math.floor(parseFloat(form.nota)||0))}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><div style="font-size:18px;font-weight:700;color:${P.dark}">${form.numAvals||"—"}</div><div style="font-size:10px;color:${P.muted};font-family:'Montserrat',sans-serif;letter-spacing:.05em">Avaliações</div></div>
        <div><div style="font-size:18px;font-weight:700;color:${P.dark}">${form.numFotos||"—"}</div><div style="font-size:10px;color:${P.muted};font-family:'Montserrat',sans-serif;letter-spacing:.05em">Fotos</div></div>
        <div><div style="font-size:18px;font-weight:700;color:${P.gold}">#${form.posicao||"—"}</div><div style="font-size:10px;color:${P.muted};font-family:'Montserrat',sans-serif;letter-spacing:.05em">Posição</div></div>
      </div>
    </div>
  </div>
  <div class="card">${scoreBars}</div>
  ${pgNum(P.gold)}
</div>`:""}

${temConcs?`
<div class="pg">
  <div class="label">${t.tituloConc}</div>
  <h2>Benchmarking Competitivo</h2>
  <div class="gold-line"></div>
  <p style="margin-bottom:20px">${t.diferenciais}</p>
  <div style="border-radius:12px;overflow:hidden;border:1px solid ${P.border};margin-bottom:20px">${mapSVG}</div>
  <div class="card">${concRows}</div>
  ${pgNum(P.gold)}
</div>`:""}

${temIG?`
<div class="pg">
  <div class="label">${t.tituloIg}</div>
  <h2>Análise de Autoridade Digital</h2>
  <div class="gold-line"></div>
  ${ig.handle?`<div style="font-size:13px;font-weight:600;color:${P.gold};margin-bottom:16px;font-family:'Montserrat',sans-serif">@${ig.handle}${ig.seguidores?" · "+ig.seguidores+" seguidores":""}</div>`:""}
  ${ig.printUrl?`<div style="margin-bottom:20px;border-radius:12px;overflow:hidden;border:1px solid ${P.border}"><img src="${ig.printUrl}" style="max-width:100%;max-height:180px;object-fit:contain;display:block"/></div>`:""}
  <div class="highlight"><p style="color:${P.dark}">${t.igAnalise}</p></div>
  ${igCriticasHtml?`<div style="margin-top:16px">${igCriticasHtml}</div>`:""}
  ${pgNum(P.gold)}
</div>`:""}

<div class="pg pg-dark" style="justify-content:space-between">
  <div>
    <div style="font-size:9px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:${P.gold};font-family:'Montserrat',sans-serif;margin-bottom:20px">${t.tituloProx}</div>
    <h1 style="color:#fff;font-size:36px;margin-bottom:20px;line-height:1.1">Plano de ação estratégico</h1>
    <p style="color:#777;font-size:14px;line-height:1.85;max-width:420px">${t.proximos}</p>
  </div>
  <div style="background:#1a1a1a;border:1px solid #333;border-radius:16px;padding:28px 32px">
    <div style="display:flex;align-items:center;gap:20px">
      ${qrHtml?`<div style="flex-shrink:0">${qrHtml}</div>`:""}
      <div>
        <div style="font-size:16px;font-weight:700;color:#fff;font-family:'Montserrat',sans-serif;margin-bottom:4px">${form.cslNome||empresa}</div>
        <div style="font-size:12px;color:${P.gold};font-weight:600;margin-bottom:12px;font-family:'Montserrat',sans-serif">${empresa}</div>
        ${form.cslWhats?`<div style="font-size:12px;color:#666;margin-bottom:4px">📱 ${form.cslWhats}</div>`:""}
        ${form.cslInsta?`<div style="font-size:12px;color:#666">@${form.cslInsta}</div>`:""}
      </div>
    </div>
  </div>
  ${pgNum(P.gold,"#111")}
</div>

</body></html>`;
  }

  // ═══════════════════════════════════════════════════════
  // MODELO 3 — LUXO (Louis Vuitton + Rolex + Bentley)
  // ═══════════════════════════════════════════════════════
  if(layout==="luxo") {
    const L={dark:"#0A0A0A",gold:"#D4AF37",champagne:"#E8D9B5",white:"#FAFAFA",muted:"#888",border:"rgba(212,175,55,.25)"};
    const scoreBars=scoreCritsData.map(({l,pts,max})=>`<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;margin-bottom:5px"><span style="font-size:10px;color:${L.muted};letter-spacing:.06em;text-transform:uppercase">${l}</span><span style="font-size:10px;font-weight:600;color:${pts===max?L.gold:L.muted}">${pts}/${max}</span></div><div style="height:1px;background:rgba(255,255,255,.08)"><div style="height:100%;width:${(pts/max)*100}%;background:${pts===max?L.gold:"rgba(212,175,55,.4)"};"></div></div></div>`).join("");
    const logoHtmlL=logoUrl?`<img src="${logoUrl}" style="height:44px;width:44px;object-fit:cover;border-radius:10px;display:block"/>`:`<img src="${LOGO_B64}" style="height:44px;width:auto;object-fit:contain;display:block;filter:brightness(10)"/>`;
    return`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>Diagnóstico — ${form.nome}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Inter:wght@300;400;500&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:#fff;color:${L.dark};-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg{width:210mm;min-height:297mm;padding:56px;page-break-after:always;display:flex;flex-direction:column;background:${L.dark}}
.pg:last-child{page-break-after:avoid}
.pg-light{background:${L.white};color:${L.dark}}
h1{font-family:'Cormorant Garamond',serif;font-size:36px;font-weight:400;letter-spacing:.02em;line-height:1.2}
h2{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:400;margin-bottom:20px;letter-spacing:.02em}
p{font-size:12px;line-height:1.9;font-weight:300;letter-spacing:.01em}
.label{font-size:9px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:${L.gold};margin-bottom:12px}
.gold-border{border:1px solid ${L.border};border-radius:12px;padding:28px 32px;margin-bottom:20px}
.thin-line{height:1px;background:${L.border};margin:24px 0}
@page{size:A4;margin:0}
</style></head><body>

<div class="pg" style="justify-content:space-between">
  <div style="display:flex;align-items:center;justify-content:space-between">
    ${logoHtmlL}
    <div style="font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:${L.gold};font-weight:500">Diagnóstico · Exclusivo</div>
  </div>
  <div style="text-align:center">
    <div class="label" style="text-align:center">${t.tituloIntro}</div>
    <div style="width:40px;height:1px;background:${L.gold};margin:0 auto 24px"></div>
    <h1 style="color:${L.white};font-size:44px;margin-bottom:12px;line-height:1">${form.nome||"Diagnóstico"}</h1>
    ${form.categoria?`<div style="font-size:13px;color:${L.gold};letter-spacing:.1em;text-transform:uppercase;font-weight:300">${form.categoria}${form.especializacao?" · "+form.especializacao:""}</div>`:""}
    ${form.cidade?`<div style="font-size:12px;color:${L.muted};margin-top:8px;letter-spacing:.08em">${form.cidade}${form.estado?", "+form.estado:""}</div>`:""}
    <div style="width:40px;height:1px;background:${L.border};margin:24px auto 0"></div>
  </div>
  <div style="display:flex;align-items:flex-end;justify-content:space-between">
    <div><div style="font-size:10px;color:${L.muted};letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px">Preparado por</div><div style="font-size:14px;color:${L.white};font-family:'Cormorant Garamond',serif;font-weight:400;font-style:italic">${form.cslNome||empresa}</div><div style="font-size:11px;color:${L.gold};letter-spacing:.08em">${empresa}</div></div>
    <div style="font-size:9px;color:${L.muted};letter-spacing:.12em;text-transform:uppercase">Confidencial</div>
  </div>
</div>

<div class="pg pg-light">
  <div class="label">${t.tituloIntro}</div>
  <h2>${form.nome}</h2>
  <div class="thin-line"></div>
  <div class="gold-border" style="background:${L.white}"><p style="font-size:14px;line-height:1.9;color:${L.dark};font-weight:400">${t.intro}</p></div>
  <div style="padding:20px 0;border-top:1px solid ${L.border};border-bottom:1px solid ${L.border};margin:8px 0"><p style="font-style:italic;color:#555;font-size:13px;line-height:1.85">${t.problema}</p></div>
  ${(kws||[]).length>0?`<div style="margin-top:20px"><div class="label">Palavras-chave monitoradas</div><div>${(kws||[]).map(k=>`<span style="display:inline-block;border:1px solid ${L.border};padding:4px 12px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;margin:2px 3px;color:${L.dark}">${k.term||k}</span>`).join("")}</div></div>`:""}
  ${pgNum(L.gold)}
</div>

${kwPageHtml}

${temDadosGoogle?`
<div class="pg pg-light">
  <div class="label">${t.tituloAnalise}</div>
  <h2>Análise de Presença</h2>
  <div class="thin-line"></div>
  ${form.fichaScreenshot?`<div style="margin-bottom:20px;border:1px solid ${L.border};border-radius:8px;overflow:hidden"><img src="${form.fichaScreenshot}" style="max-width:100%;max-height:160px;object-fit:contain;display:block;margin:0 auto"/></div>`:""}
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
    <div class="gold-border" style="text-align:center;background:${L.white}">${gaugeSVG}<div style="font-size:10px;color:${L.muted};letter-spacing:.1em;text-transform:uppercase;margin-top:4px">Score digital</div></div>
    <div class="gold-border" style="background:${L.white}">
      <div style="font-family:'Cormorant Garamond',serif;font-size:36px;color:${L.dark}">${form.nota||"—"}<span style="font-size:16px;color:${L.muted}">/5.0</span></div>
      <div style="color:#D4AF37;font-size:14px;margin-bottom:12px">${"★".repeat(Math.floor(parseFloat(form.nota)||0))}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div><div style="font-size:16px;font-family:'Cormorant Garamond',serif;color:${L.dark}">${form.numAvals||"—"}</div><div style="font-size:9px;color:${L.muted};text-transform:uppercase;letter-spacing:.08em">Avaliações</div></div>
        <div><div style="font-size:16px;font-family:'Cormorant Garamond',serif;color:${L.gold}">#${form.posicao||"—"}</div><div style="font-size:9px;color:${L.muted};text-transform:uppercase;letter-spacing:.08em">Posição</div></div>
      </div>
    </div>
  </div>
  <div class="gold-border" style="background:${L.white}">${scoreBars}</div>
  ${pgNum(L.gold)}
</div>`:""}

${temConcs?`
<div class="pg pg-light">
  <div class="label">${t.tituloConc}</div>
  <h2>Posicionamento competitivo</h2>
  <div class="thin-line"></div>
  <div style="border:1px solid ${L.border};border-radius:8px;overflow:hidden;margin-bottom:20px">${mapSVG}</div>
  <div class="gold-border" style="background:${L.white}">${concRows}</div>
  ${pgNum(L.gold)}
</div>`:""}

${temIG?`
<div class="pg pg-light">
  <div class="label">${t.tituloIg}</div>
  <h2>Presença digital</h2>
  <div class="thin-line"></div>
  ${ig.handle?`<div style="font-size:12px;color:${L.gold};letter-spacing:.1em;text-transform:uppercase;margin-bottom:16px">@${ig.handle}</div>`:""}
  ${ig.printUrl?`<div style="margin-bottom:20px;border:1px solid ${L.border};overflow:hidden"><img src="${ig.printUrl}" style="max-width:100%;max-height:180px;object-fit:contain;display:block"/></div>`:""}
  <div style="padding:20px;background:${L.white};border-top:1px solid ${L.border};border-bottom:1px solid ${L.border};margin-bottom:16px"><p style="font-style:italic;color:#555">${t.igAnalise}</p></div>
  ${igCriticasHtml?`<div>${igCriticasHtml}</div>`:""}
  ${pgNum(L.gold)}
</div>`:""}

<div class="pg" style="justify-content:space-between">
  <div>
    <div class="label" style="color:${L.gold}">${t.tituloProx}</div>
    <div style="width:40px;height:1px;background:${L.gold};margin:16px 0 24px"></div>
    <h1 style="color:${L.white};font-size:38px;margin-bottom:20px;line-height:1.1;font-style:italic">O próximo passo<br/>é uma conversa.</h1>
    <p style="color:${L.muted};font-size:13px;max-width:380px;line-height:1.9">${t.proximos}</p>
  </div>
  <div style="border:1px solid ${L.border};padding:28px 32px;border-radius:4px">
    <div style="display:flex;align-items:center;gap:20px">
      ${qrHtml?`<div style="flex-shrink:0">${qrHtml}</div>`:""}
      <div>
        <div style="font-size:16px;font-family:'Cormorant Garamond',serif;color:${L.white};font-style:italic;margin-bottom:4px">${form.cslNome||empresa}</div>
        <div style="font-size:11px;color:${L.gold};letter-spacing:.1em;text-transform:uppercase;margin-bottom:12px">${empresa}</div>
        ${form.cslWhats?`<div style="font-size:11px;color:${L.muted};margin-bottom:4px">${form.cslWhats}</div>`:""}
        ${form.cslInsta?`<div style="font-size:11px;color:${L.muted}">@${form.cslInsta}</div>`:""}
      </div>
    </div>
  </div>
  ${pgNum(L.gold,"#111")}
</div>

</body></html>`;
  }

  // ═══════════════════════════════════════════════════════
  // MODELO 4 — RELATÓRIO (PwC + KPMG + Nubank)
  // ═══════════════════════════════════════════════════════
  if(layout==="relatorio") {
    const R={dark:"#0B1F3A",mid:"#1E3A5F",gray:"#E5E7EB",white:"#FFFFFF",muted:"#6B7280",accent:"#0B1F3A",text:"#111827"};
    const scoreBars=scoreCritsData.map(({l,pts,max})=>`<tr><td style="padding:8px 12px;font-size:12px;color:${R.text};border-bottom:1px solid ${R.gray}">${l}</td><td style="padding:8px 12px;text-align:center;font-size:12px;font-weight:700;color:${R.dark};border-bottom:1px solid ${R.gray}">${pts}</td><td style="padding:8px 12px;text-align:center;font-size:12px;color:${R.muted};border-bottom:1px solid ${R.gray}">${max}</td><td style="padding:8px 12px;border-bottom:1px solid ${R.gray}"><div style="height:8px;background:${R.gray};border-radius:2px"><div style="height:100%;width:${(pts/max)*100}%;background:${pts===max?"#16A34A":pts>0?R.dark:R.gray};border-radius:2px"></div></div></td><td style="padding:8px 12px;text-align:center;font-size:11px;font-weight:600;color:${pts===max?"#16A34A":pts>0?R.dark:R.muted};border-bottom:1px solid ${R.gray}">${Math.round((pts/max)*100)}%</td></tr>`).join("");
    return`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>Diagnóstico — ${form.nome}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:#fff;color:${R.text};-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg{width:210mm;min-height:297mm;page-break-after:always;display:flex;flex-direction:column;background:#fff}
.pg:last-child{page-break-after:avoid}
.header{background:${R.dark};padding:20px 40px;display:flex;align-items:center;justify-content:space-between}
.body{padding:32px 40px;flex:1;display:flex;flex-direction:column}
h1{font-family:'IBM Plex Sans',sans-serif;font-size:22px;font-weight:700;color:${R.dark};margin-bottom:6px}
h2{font-family:'IBM Plex Sans',sans-serif;font-size:16px;font-weight:600;color:${R.dark};margin-bottom:12px}
h3{font-family:'IBM Plex Sans',sans-serif;font-size:13px;font-weight:600;color:${R.dark}}
p{font-size:12px;color:${R.muted};line-height:1.7}
.label{font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:${R.dark};margin-bottom:6px;font-family:'IBM Plex Sans',sans-serif;opacity:.6}
.section{margin-bottom:24px}
table{width:100%;border-collapse:collapse}
th{background:${R.dark};color:#fff;padding:8px 12px;font-size:11px;font-weight:600;text-align:left;font-family:'IBM Plex Sans',sans-serif;letter-spacing:.04em}
.kpi{background:${R.gray};border-radius:8px;padding:14px 16px;text-align:center}
.kpi-val{font-family:'IBM Plex Sans',sans-serif;font-size:26px;font-weight:700;color:${R.dark}}
.kpi-label{font-size:10px;color:${R.muted};text-transform:uppercase;letter-spacing:.08em;margin-top:2px}
.divider{height:1px;background:${R.gray};margin:16px 0}
@page{size:A4;margin:0}
</style></head><body>

<div class="pg">
  <div class="header">
    ${logoHtml}
    <div style="text-align:right"><div style="font-size:10px;color:rgba(255,255,255,.5);font-family:'IBM Plex Sans',sans-serif;letter-spacing:.08em;text-transform:uppercase">Diagnóstico de Presença Digital</div><div style="font-size:10px;color:rgba(255,255,255,.3);margin-top:2px">${empresa} · Confidencial</div></div>
  </div>
  <div class="body">
    <div style="border-left:4px solid ${R.dark};padding-left:20px;margin-bottom:28px">
      <div class="label">Relatório Técnico</div>
      <h1>${form.nome||"Diagnóstico"}</h1>
      <div style="font-size:12px;color:${R.muted}">${form.categoria||""}${form.especializacao?" · "+form.especializacao:""} · ${form.cidade||""}${form.estado?", "+form.estado:""}</div>
    </div>
    <div class="section">
      <h2>Sumário executivo</h2>
      <div class="divider"></div>
      <p style="font-size:13px;color:${R.text};line-height:1.75">${t.intro}</p>
    </div>
    <div style="background:${R.dark};color:#fff;padding:16px 20px;border-radius:8px;margin-bottom:20px">
      <div style="font-size:10px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;font-family:'IBM Plex Sans',sans-serif">Contexto de mercado</div>
      <p style="color:rgba(255,255,255,.8);font-size:12px;line-height:1.7">${t.problema}</p>
    </div>
    ${(kws||[]).length>0?`<div class="section"><h2>Termos monitorados</h2><div class="divider"></div><table><thead><tr><th>Palavra-chave</th><th>Vol. estimado/mês</th><th>Posição atual</th><th>Status</th></tr></thead><tbody>${(kws||[]).map(k=>{const pos=parseInt(k.pos||0);const st=pos<=3?"Top 3":pos<=10?"Pág. 1":pos>10?"Pág. "+Math.ceil(pos/10):"—";const stC=pos<=3?"#16A34A":pos<=10?"#F59E0B":pos>10?"#EF4444":R.muted;return`<tr><td style="padding:8px 12px;font-size:12px;border-bottom:1px solid ${R.gray}">${k.term||k}</td><td style="padding:8px 12px;font-size:12px;font-weight:600;color:${R.dark};border-bottom:1px solid ${R.gray}">${k.volume||"—"}</td><td style="padding:8px 12px;font-size:12px;font-weight:700;color:${R.dark};border-bottom:1px solid ${R.gray}">${k.pos?"#"+k.pos:"—"}</td><td style="padding:8px 12px;font-size:11px;font-weight:600;color:${stC};border-bottom:1px solid ${R.gray}">${st}</td></tr>`;}).join("")}</tbody></table></div>`:""}
    ${pgNum(R.dark)}
  </div>
</div>

${temDadosGoogle?`
<div class="pg">
  <div class="header"><h2 style="color:#fff;font-family:'IBM Plex Sans',sans-serif;font-size:14px;font-weight:600">${t.tituloAnalise}</h2><div style="font-size:10px;color:rgba(255,255,255,.4)">${empresa}</div></div>
  <div class="body">
    ${form.fichaScreenshot?`<div style="margin-bottom:16px;border:1px solid ${R.gray};border-radius:8px;overflow:hidden"><img src="${form.fichaScreenshot}" style="max-width:100%;max-height:140px;object-fit:contain;display:block;margin:0 auto"/></div>`:""}
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
      <div class="kpi"><div class="kpi-val">${form.nota||"—"}</div><div class="kpi-label">Nota Google</div></div>
      <div class="kpi"><div class="kpi-val">${form.numAvals||"—"}</div><div class="kpi-label">Avaliações</div></div>
      <div class="kpi"><div class="kpi-val">${form.numFotos||"—"}</div><div class="kpi-label">Fotos</div></div>
      <div class="kpi"><div class="kpi-val" style="color:${R.dark}">#${form.posicao||"—"}</div><div class="kpi-label">Posição</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 2fr;gap:16px;margin-bottom:20px">
      <div style="text-align:center;background:${R.gray};border-radius:8px;padding:16px">${gaugeSVG}<div class="kpi-label" style="margin-top:4px">Score geral</div></div>
      <div>
        <h3 style="margin-bottom:12px">Análise por critério</h3>
        <table><thead><tr><th>Critério</th><th style="text-align:center">Pts</th><th style="text-align:center">Max</th><th>Progresso</th><th style="text-align:center">%</th></tr></thead><tbody>${scoreBars}</tbody></table>
      </div>
    </div>
    <p style="font-size:12px;color:${R.text};line-height:1.7">${t.dados}</p>
    ${pgNum(R.dark)}
  </div>
</div>`:""}

${temConcs?`
<div class="pg">
  <div class="header"><h2 style="color:#fff;font-family:'IBM Plex Sans',sans-serif;font-size:14px;font-weight:600">${t.tituloConc}</h2><div style="font-size:10px;color:rgba(255,255,255,.4)">${empresa}</div></div>
  <div class="body">
    <p style="margin-bottom:16px">${t.diferenciais}</p>
    <div style="border:1px solid ${R.gray};border-radius:8px;overflow:hidden;margin-bottom:16px">${mapSVG}</div>
    <table><thead><tr><th>Pos.</th><th>Negócio</th><th style="text-align:center">Nota</th><th style="text-align:center">Aval.</th><th>Diferencial</th></tr></thead><tbody>${concs.slice(0,5).map((c,i)=>`<tr><td style="padding:8px 12px;font-weight:700;color:${i===0?"#EF4444":i===1?"#F59E0B":R.dark};border-bottom:1px solid ${R.gray}">#${c.posicao||i+1}</td><td style="padding:8px 12px;font-size:12px;font-weight:600;border-bottom:1px solid ${R.gray}">${c.nome}</td><td style="padding:8px 12px;text-align:center;font-size:12px;font-weight:700;border-bottom:1px solid ${R.gray}">${c.nota}★</td><td style="padding:8px 12px;text-align:center;font-size:12px;border-bottom:1px solid ${R.gray}">${c.avals}</td><td style="padding:8px 12px;font-size:11px;color:${R.muted};border-bottom:1px solid ${R.gray}">${c.diferencial||"—"}</td></tr>`).join("")}</tbody></table>
    ${pgNum(R.dark)}
  </div>
</div>`:""}

${temIG?`
<div class="pg">
  <div class="header"><h2 style="color:#fff;font-family:'IBM Plex Sans',sans-serif;font-size:14px;font-weight:600">${t.tituloIg}</h2><div style="font-size:10px;color:rgba(255,255,255,.4)">${empresa}</div></div>
  <div class="body">
    ${ig.printUrl?`<div style="margin-bottom:16px;border:1px solid ${R.gray};border-radius:8px;overflow:hidden"><img src="${ig.printUrl}" style="max-width:100%;max-height:160px;object-fit:contain;display:block"/></div>`:""}
    ${ig.handle?`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px"><div class="kpi"><div class="kpi-val">@${ig.handle}</div><div class="kpi-label">Handle</div></div><div class="kpi"><div class="kpi-val">${ig.seguidores||"—"}</div><div class="kpi-label">Seguidores</div></div><div class="kpi"><div class="kpi-val">${ig.score||"—"}</div><div class="kpi-label">Score</div></div></div>`:""}
    <p style="margin-bottom:16px">${t.igAnalise}</p>
    ${igCriticasHtml?`<div>${igCriticasHtml}</div>`:""}
    ${pgNum(R.dark)}
  </div>
</div>`:""}

<div class="pg">
  <div class="header"><h2 style="color:#fff;font-family:'IBM Plex Sans',sans-serif;font-size:14px;font-weight:600">${t.tituloProx}</h2><div style="font-size:10px;color:rgba(255,255,255,.4)">${empresa}</div></div>
  <div class="body" style="justify-content:space-between">
    <div>
      <h1 style="margin-bottom:8px">Recomendações</h1>
      <div class="divider"></div>
      <p style="font-size:13px;color:${R.text};line-height:1.75;margin-bottom:20px">${t.proximos}</p>
    </div>
    <div style="background:${R.dark};border-radius:12px;padding:24px 28px">
      <div style="display:flex;align-items:center;gap:20px">
        ${qrHtml?`<div style="flex-shrink:0">${qrHtml}</div>`:""}
        <div>
          <div style="font-size:15px;font-weight:700;color:#fff;font-family:'IBM Plex Sans',sans-serif;margin-bottom:4px">${form.cslNome||empresa}</div>
          <div style="font-size:11px;color:rgba(255,255,255,.5);margin-bottom:10px;font-family:'IBM Plex Sans',sans-serif;text-transform:uppercase;letter-spacing:.08em">${empresa}</div>
          ${form.cslWhats?`<div style="font-size:12px;color:rgba(255,255,255,.5);margin-bottom:4px">${form.cslWhats}</div>`:""}
          ${form.cslInsta?`<div style="font-size:12px;color:rgba(255,255,255,.5)">@${form.cslInsta}</div>`:""}
        </div>
      </div>
    </div>
    ${pgNum(R.dark,"#0B1F3A")}
  </div>
</div>

</body></html>`;
  }

  // ═══════════════════════════════════════════════════════
  // MODELO 5 — CUSTOM (cor da marca — design atual)
  // ═══════════════════════════════════════════════════════
  {
    const logoHtmlC=logoUrl?`<img src="${logoUrl}" style="height:44px;width:44px;object-fit:cover;border-radius:12px;display:block"/>`:`<img src="${LOGO_B64}" style="height:44px;width:auto;object-fit:contain;display:block;filter:brightness(10)"/>`;
    const scoreBars=scoreCritsData.map(({l,pts,max})=>`<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:11px;color:#777;font-weight:500">${l}</span><span style="font-size:11px;font-weight:700;color:${pts===max?"#16A34A":pts>0?c1:"#ccc"}">${pts}<span style="color:#ccc;font-weight:400">/${max}</span></span></div><div style="height:4px;background:#f0f0f0;border-radius:2px"><div style="height:100%;width:${(pts/max)*100}%;background:${pts===max?"#16A34A":pts>0?c1:"transparent"};border-radius:2px"></div></div></div>`).join("");
    return`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>Diagnóstico — ${form.nome}</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',-apple-system,sans-serif;background:#fff;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg{width:210mm;min-height:297mm;padding:0;page-break-after:always;display:flex;flex-direction:column;position:relative;overflow:hidden}
.pg:last-child{page-break-after:avoid}
.accent{position:absolute;top:0;left:0;width:3px;height:100%;background:${c1}}
.body{padding:52px 56px 44px 60px;flex:1;display:flex;flex-direction:column}
h1{font-family:'Space Grotesk',sans-serif;font-size:28px;font-weight:800;color:#0a0a0a;letter-spacing:-.5px;line-height:1.2}
h2{font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:700;color:#0a0a0a;letter-spacing:-.3px;line-height:1.3}
p{font-size:13px;color:#555;line-height:1.75}
.label{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:${c1};margin-bottom:8px}
.card{background:#fff;border:1px solid #f0f0f0;border-radius:16px;padding:28px 32px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.highlight{background:${c1}08;border:1px solid ${c1}20;border-left:3px solid ${c1};border-radius:0 12px 12px 0;padding:18px 22px}
.insight{background:#0a0a0a;border-radius:14px;padding:22px 28px;margin:24px 0}
.divider{height:1px;background:#f5f5f5;margin:28px 0}
@page{size:A4;margin:0}
</style></head><body>

<div class="pg" style="background:#0a0a0a">
  <div style="position:absolute;top:0;right:0;width:45%;height:100%;background:linear-gradient(135deg,${c1}18 0%,${c1}06 50%,transparent 100%)"></div>
  <div class="body" style="padding:64px 64px 52px;justify-content:space-between;background:transparent">
    <div style="display:flex;align-items:center;justify-content:space-between">
      ${logoHtmlC}
      <div style="font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:${c1};opacity:.8">Diagnóstico Digital</div>
    </div>
    <div>
      <div style="font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:${c1};margin-bottom:20px">Análise de Presença Digital</div>
      <h1 style="font-size:38px;color:#fff;margin-bottom:12px;line-height:1.1">${form.nome||"Seu Negócio"}</h1>
      ${form.categoria?`<div style="font-size:15px;color:#888;margin-bottom:6px">${form.categoria}${form.especializacao?" · "+form.especializacao:""}</div>`:""}
      ${form.cidade?`<div style="font-size:13px;color:#666">${form.cidade}${form.estado?", "+form.estado:""}</div>`:""}
    </div>
    <div style="display:flex;align-items:flex-end;justify-content:space-between">
      <div><div style="font-size:11px;color:#555;margin-bottom:4px">Preparado por</div><div style="font-size:14px;font-weight:700;color:#fff">${form.cslNome||empresa}</div><div style="font-size:12px;color:${c1};font-weight:500">${empresa}</div></div>
      <div style="text-align:right"><div style="font-size:10px;color:#444;letter-spacing:.08em;text-transform:uppercase">Confidencial</div></div>
    </div>
  </div>
</div>

<div class="pg"><div class="accent"></div><div class="body">
  <div style="margin-bottom:48px"><div class="label">${t.tituloIntro}</div><h1 style="margin-bottom:16px">Diagnóstico de<br/>Presença Digital</h1><p style="max-width:480px;font-size:14px;line-height:1.8">${t.intro}</p></div>
  <div class="insight"><div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:${c1};margin-bottom:12px">Contexto de mercado</div><p style="color:#aaa;font-size:13px;line-height:1.75">${t.problema}</p></div>
  ${(kws||[]).length>0?`<div style="margin-top:28px"><div class="label" style="margin-bottom:10px">Termos monitorados</div><div>${(kws||[]).map(k=>`<span style="display:inline-block;background:${c1}10;color:${c1};border:1px solid ${c1}22;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;margin:2px 3px">${k.term||k}</span>`).join("")}</div></div>`:""}
  ${pgNum(c1)}
</div></div>

${kwPageHtml}

${temDadosGoogle?`<div class="pg"><div class="accent"></div><div class="body">
  <div style="margin-bottom:40px"><div class="label">${t.tituloAnalise}</div><h1 style="margin-bottom:14px">Presença no Google</h1><p style="max-width:460px">${t.dados}</p></div>
  ${form.fichaScreenshot?`<div style="margin-bottom:28px;border-radius:14px;overflow:hidden;border:1px solid #f0f0f0"><img src="${form.fichaScreenshot}" style="max-width:100%;max-height:180px;object-fit:contain;display:block;margin:0 auto"/></div>`:""}
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px">
    <div class="card" style="text-align:center">${gaugeSVG}<div style="font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#aaa;margin-top:4px">Score de presença</div></div>
    <div class="card"><div style="font-size:32px;font-weight:800;color:#0a0a0a;font-family:'Space Grotesk',sans-serif;letter-spacing:-1px">${form.nota}<span style="font-size:16px;color:#ccc;font-weight:400">/5.0</span></div><div style="color:#f59e0b;font-size:16px;letter-spacing:2px">${"★".repeat(Math.floor(parseFloat(form.nota)||0))}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px"><div><div style="font-size:18px;font-weight:700">${form.numAvals||"—"}</div><div style="font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:.06em">Avaliações</div></div><div><div style="font-size:18px;font-weight:700">${form.numFotos||"—"}</div><div style="font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:.06em">Fotos</div></div><div><div style="font-size:18px;font-weight:700;color:${c1}">#${form.posicao||"—"}</div><div style="font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:.06em">Posição</div></div></div></div>
  </div>
  <div class="card">${scoreBars}</div>
  ${pgNum(c1)}
</div></div>`:""}

${temConcs?`<div class="pg"><div class="accent"></div><div class="body">
  <div style="margin-bottom:40px"><div class="label">${t.tituloConc}</div><h1 style="margin-bottom:14px">Cenário competitivo</h1><p style="max-width:460px">${t.diferenciais}</p></div>
  <div style="border-radius:14px;overflow:hidden;border:1px solid #f0f0f0;margin-bottom:24px">${mapSVG}</div>
  <div class="card"><div class="label" style="margin-bottom:16px">Concorrentes identificados</div>${concs.slice(0,5).map((c,i)=>`<div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid #f5f5f5"><div style="width:28px;height:28px;border-radius:50%;background:${i===0?"#EF4444":i===1?"#F59E0B":"#94A3B8"};color:#fff;font-weight:800;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${c.posicao||i+1}</div><div style="flex:1"><div style="font-size:13px;font-weight:600;color:#111">${c.nome}</div>${c.diferencial?`<div style="font-size:11px;color:#999;margin-top:2px">${c.diferencial}</div>`:""}</div><div style="text-align:right"><div style="font-size:13px;font-weight:700">${c.nota}★</div><div style="font-size:10px;color:#aaa">${c.avals}</div></div></div>`).join("")}</div>
  ${pgNum(c1)}
</div></div>`:""}

${temIG?`<div class="pg"><div class="accent"></div><div class="body">
  <div style="margin-bottom:40px"><div class="label">${t.tituloIg}</div><h1 style="margin-bottom:14px">Presença no Instagram</h1>${ig.handle?`<div style="font-size:14px;font-weight:600;color:${c1}">@${ig.handle}${ig.seguidores?" · "+ig.seguidores+" seguidores":""}</div>`:""}</div>
  ${ig.printUrl?`<div style="margin-bottom:24px;border-radius:14px;overflow:hidden;border:1px solid #f0f0f0;max-height:200px;display:flex;align-items:center;justify-content:center;background:#fafafa"><img src="${ig.printUrl}" style="max-width:100%;max-height:200px;object-fit:contain;display:block"/></div>`:""}
  <div class="highlight" style="margin-bottom:28px"><p style="font-size:13px;color:#444;line-height:1.75">${t.igAnalise}</p></div>
  ${igCriticasHtml?`<div class="card"><div class="label" style="margin-bottom:16px;color:#EF4444">Pontos de atenção</div>${igCriticasHtml}</div>`:""}
  ${pgNum(c1)}
</div></div>`:""}

<div class="pg" style="background:#0a0a0a"><div style="position:absolute;top:0;right:0;width:40%;height:100%;background:linear-gradient(135deg,${c1}12 0%,transparent 70%)"></div>
  <div class="body" style="padding:64px;justify-content:space-between;background:transparent">
    <div><div style="font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:${c1};margin-bottom:20px">${t.tituloProx}</div><h1 style="font-size:34px;color:#fff;margin-bottom:20px;line-height:1.15">O próximo passo<br/>é uma conversa.</h1><p style="color:#777;font-size:14px;line-height:1.8;max-width:400px">${t.proximos}</p></div>
    <div style="background:#161616;border:1px solid #222;border-radius:20px;padding:32px 36px"><div style="display:flex;align-items:center;gap:24px">${qrHtml?`<div style="flex-shrink:0">${qrHtml}</div>`:""}<div><div style="font-size:18px;font-weight:800;color:#fff;font-family:'Space Grotesk',sans-serif;margin-bottom:4px">${form.cslNome||empresa}</div><div style="font-size:13px;color:${c1};font-weight:600;margin-bottom:14px">${empresa}</div>${form.cslWhats?`<div style="font-size:12px;color:#666;margin-bottom:4px">📱 ${form.cslWhats}</div>`:""}${form.cslInsta?`<div style="font-size:12px;color:#666">@${form.cslInsta}</div>`:""}</div></div></div>
    ${pgNum(c1,"#0a0a0a")}
  </div>
</div>

</body></html>`;
  }
}
