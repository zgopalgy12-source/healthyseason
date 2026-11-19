import Link from "next/link";
import { ArrowRight, Barcode, Camera, ChartNoAxesColumnIncreasing, CircleCheck, ScanLine, Utensils } from "lucide-react";
import { Brand } from "@/components/brand";

const steps = [
  { title: "Digitalize", text: "Aponte a câmara ao código de barras da embalagem. O produto é reconhecido em segundos." },
  { title: "Veja os valores", text: "Calorias, proteínas, hidratos de carbono e gorduras do produto, logo no ecrã." },
  { title: "Registe a refeição", text: "Adicione ao pequeno-almoço, almoço, lanche ou jantar e veja quanto falta para a sua meta." },
];

const features = [
  { title: "Plano personalizado", text: "Defina o seu objetivo e acompanhe as suas metas diárias de calorias e macronutrientes.", Icon: ChartNoAxesColumnIncreasing },
  { title: "Scanner de produtos", text: "Aponte a câmara à embalagem e o produto aparece com os valores nutricionais.", Icon: Barcode },
  { title: "Calorias por foto", text: "Fotografe a sua refeição para obter uma estimativa das porções e dos valores nutricionais.", Icon: Camera },
];

const questions = [
  { title: "O que posso fazer com a minha conta agora?", text: "Já pode criar uma conta e editar o seu perfil. O plano, o diário, o scanner e a análise por foto serão disponibilizados nas próximas fases." },
  { title: "Em que dispositivos funciona?", text: "Pode abrir a Healthy Season no navegador do telemóvel, tablet ou computador." },
  { title: "Os meus dados são privados?", text: "O seu perfil está protegido pela sessão da sua conta e só pode ser consultado ou alterado por si." },
  { title: "A Healthy Season substitui um nutricionista?", text: "A Healthy Season é uma ferramenta informativa. Para aconselhamento médico ou nutricional, fale com um profissional de saúde." },
];

function StartLink() {
  return <Link className="button" href="/registo">Começar agora <ArrowRight size={18} aria-hidden="true" /></Link>;
}

function ScannerPreview() {
  return <div className="preview" aria-label="Exemplo de uma leitura nutricional">
    <div className="preview-head"><span><ScanLine size={18} aria-hidden="true" /> Scanner</span><small>Pré-visualização</small></div>
    <div className="scan-view"><div className="scan-frame"><Barcode size={92} strokeWidth={1.2} aria-hidden="true" /></div></div>
    <div className="preview-values">
      <span className="kicker">Valores por 100 g</span>
      <div className="preview-product"><strong>Iogurte natural</strong><span><b>63</b> kcal</span></div>
      <dl className="macros">{[["Proteínas", "4,1 g"], ["Hidratos", "5,0 g"], ["Gorduras", "3,5 g"]].map(([name, value]) =>
        <div key={name}><dt>{name}</dt><dd>{value}</dd></div>
      )}</dl>
    </div>
  </div>;
}

export default function Landing() {
  return <>
    <header className="site-header"><div className="shell header-inner">
      <Brand />
      <nav aria-label="Navegação principal">
        <a className="desktop-link" href="#como-funciona">Como funciona</a>
        <a className="desktop-link" href="#funcionalidades">Funcionalidades</a>
        <Link className="button button-secondary" href="/login">Entrar</Link>
      </nav>
    </div></header>
    <main>
      <section className="hero shell">
        <div>
          <div className="kicker hero-tag"><Utensils size={15} aria-hidden="true" /> Nutrição no dia a dia</div>
          <h1>Saiba o que come <span className="accent">em segundos.</span></h1>
          <p>Digitalize o código de barras de um produto e veja logo as calorias, as proteínas, os hidratos e as gorduras. Registe cada refeição e acompanhe a meta do seu dia.</p>
          <StartLink />
        </div>
        <ScannerPreview />
      </section>
      <section className="section band" id="como-funciona"><div className="shell">
        <p className="kicker">Como funciona</p>
        <h2>Do código de barras ao registo do dia</h2>
        <ol className="grid-three">{steps.map(({ title, text }, index) => <li className="card" key={title}>
          <p className="kicker">Passo {index + 1}</p><h3>{title}</h3><p>{text}</p>
        </li>)}</ol>
      </div></section>
      <section className="section shell" id="funcionalidades">
        <p className="kicker">Funcionalidades</p>
        <h2>Tudo para controlar a sua alimentação</h2>
        <div className="grid-three">{features.map(({ title, text, Icon }) => <article className="card" key={title}>
          <span className="feature-icon"><Icon size={24} aria-hidden="true" /></span><h3>{title}</h3><p>{text}</p>
        </article>)}</div>
      </section>
      <section className="section band"><div className="shell benefits">
        <div><h2>Escolha melhor, sem fazer contas.</h2><p>Perceber o que cada produto tem ajuda a fazer escolhas mais informadas no dia a dia.</p></div>
        <ul>{["Refeições num só lugar", "Metas ajustadas ao seu objetivo", "Calorias e macronutrientes à vista"].map((benefit) =>
          <li key={benefit}><CircleCheck size={21} aria-hidden="true" />{benefit}</li>
        )}</ul>
      </div></section>
      <section className="section shell faq" id="perguntas">
        <h2>Perguntas frequentes</h2>
        {questions.map(({ title, text }) => <details key={title}><summary>{title}</summary><p>{text}</p></details>)}
      </section>
      <section className="final-cta"><div className="shell"><h2>Comece hoje.</h2><p>Crie a sua conta na Healthy Season.</p><StartLink /></div></section>
    </main>
    <footer className="shell footer"><Brand /><p>© {new Date().getFullYear()} Healthy Season</p><a href="#perguntas">Perguntas frequentes</a></footer>
  </>;
}
