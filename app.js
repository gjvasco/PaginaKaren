const DEMO_POSTS = [
  {
    id: "demo-1",
    title: "Escuchar lo que tu cuerpo te cuenta",
    kind: "escrito",
    summary: "Reflexión sobre cómo las tensiones musculares guardan emociones no expresadas y cómo el masaje consciente abre espacio para soltar.",
    content: "Muchas veces cuidamos nuestros medios de transporte o electrodomésticos con mantenimientos frecuentes, pero olvidamos que nuestro cuerpo es el hogar más importante que habitamos.\n\nCuando te detienes a respirar y a sentir tus músculos en un masaje descontracturante con intención sanadora, empiezas a escuchar lo que tu cuerpo ha querido mostrarte hace tiempo. No se trata solo de relajar una zona, sino de integrarte en mente, cuerpo y alma.",
    media_url: "",
    cover_url: "",
    created_at: new Date().toISOString()
  },
  {
    id: "demo-2",
    title: "¿Qué se mueve en una constelación familiar?",
    kind: "escrito",
    summary: "Una mirada cercana a las constelaciones familiares grupales y por qué no es necesario entenderlo todo con la mente.",
    content: "En las constelaciones familiares grupales trabajamos con movimientos del alma. A veces llegas con una pregunta o una situación repetitiva que no logras resolver solo desde el pensamiento.\n\nAl mirar el sistema familiar con amor y respeto, la energía comienza a ordenarse. Tanto si constelas tu propio asunto como si asistes como representante u observador, algo dentro de ti se transforma.",
    media_url: "",
    cover_url: "",
    created_at: new Date().toISOString()
  },
  {
    id: "demo-3",
    title: "Contenido en Instagram · @Karensacudetumente",
    kind: "video_instagram",
    summary: "Conecta con nuestros reels, reflexiones y cápsulas de bienestar directamente desde Instagram o desde tu archivo de video en el panel.",
    content: "Sigue nuestras cápsulas semanales de mente, cuerpo y alma. Desde el panel externo de Supabase podrás pegar cualquier enlace de Reel o subir tus propios archivos de video.",
    media_url: "https://www.instagram.com/karensacudetumente/",
    cover_url: "",
    created_at: new Date().toISOString()
  }
];

const state = {
  filter: "todos",
  posts: [],
  usingDemo: false
};

const $ = (sel) => document.querySelector(sel);

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Devuelve la URL solo si es https (o http en localhost); si no, cadena vacía.
function safeUrl(url = "") {
  try {
    const u = new URL(String(url).trim());
    if (u.protocol !== "https:" && !(u.protocol === "http:" && u.hostname === "localhost")) return "";
    return u.href.replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29");
  } catch {
    return "";
  }
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  } catch {
    return "";
  }
}

function kindLabel(kind) {
  if (kind === "escrito") return "Escrito";
  if (kind === "video_instagram") return "Video · Instagram";
  if (kind === "video_youtube") return "Video · YouTube";
  return "Video propio";
}

function formatCOP(amount) {
  if (!amount || Number(amount) <= 0) return "Contenido de pago";
  return "$" + Number(amount).toLocaleString("es-CO") + " COP";
}

function getYoutubeEmbedUrl(url = "") {
  try {
    const u = new URL(url.trim());
    let videoId = "";
    if (u.hostname.includes("youtu.be")) {
      videoId = u.pathname.replace(/^\/+/, "").split("/")[0];
    } else if (u.pathname.startsWith("/shorts/")) {
      videoId = u.pathname.split("/")[2] || "";
    } else if (u.pathname.startsWith("/embed/")) {
      videoId = u.pathname.split("/")[2] || "";
    } else {
      videoId = u.searchParams.get("v") || "";
    }
    return videoId ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}` : "";
  } catch {
    return "";
  }
}

function matchesFilter(post) {
  if (state.filter === "todos") return true;
  if (state.filter === "escrito") return post.kind === "escrito";
  if (state.filter === "video") {
    return (
      post.kind === "video_archivo" ||
      post.kind === "video_instagram" ||
      post.kind === "video_youtube"
    );
  }
  return true;
}

function renderBlog() {
  const grid = $("#blog-grid");
  const status = $("#blog-status");
  if (!grid) return;

  if (state.usingDemo) {
    status.classList.remove("hidden");
    status.innerHTML =
      'Mostrando publicaciones de ejemplo. Para publicar tus propios escritos y videos desde el panel externo, configura tu proyecto de Supabase en <code>supabase-config.js</code> y entra a <a href="admin.html"><strong>admin.html</strong></a>.';
  } else {
    status.classList.add("hidden");
  }

  const filtered = state.posts.filter(matchesFilter);
  if (!filtered.length) {
    grid.innerHTML =
      '<p style="color:var(--muted)">Aún no hay publicaciones en esta categoría.</p>';
    return;
  }

  grid.innerHTML = filtered
    .map((p) => {
      const coverSafe = safeUrl(p.cover_url);
      const coverStyle = coverSafe
        ? `style="background-image:linear-gradient(to top, rgba(7,51,66,.75), rgba(7,51,66,.15)), url('${escapeHtml(coverSafe)}')"`
        : "";
      const btnText = p.is_paid
        ? "Ver acceso / comprar"
        : p.kind === "escrito"
          ? "Leer escrito"
          : "Ver video";
      const paidBadge = p.is_paid
        ? `<span class="blog-price-badge">🔒 ${formatCOP(p.price)}</span>`
        : "";
      return `
        <article class="blog-card">
          <div class="blog-cover" ${coverStyle}>
            <span class="blog-kind">${kindLabel(p.kind)}</span>
            ${paidBadge}
          </div>
          <div class="blog-body">
            <span class="blog-date">${formatDate(p.created_at)}</span>
            <h3>${escapeHtml(p.title)}</h3>
            <p>${escapeHtml(p.summary || "")}</p>
            <button class="btn btn-outline" data-open-post="${escapeHtml(p.id)}">${btnText}</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function ensureInstagramEmbedScript() {
  if (window.instgrm && window.instgrm.Embeds) {
    window.instgrm.Embeds.process();
    return;
  }
  if (!document.querySelector('script[src*="instagram.com/embed.js"]')) {
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.instagram.com/embed.js";
    s.onload = () => window.instgrm?.Embeds?.process();
    document.body.appendChild(s);
  }
}

function openPostModal(id) {
  const post = state.posts.find((p) => String(p.id) === String(id));
  if (!post) return;

  const modal = $("#blog-modal");
  const body = $("#modal-body");

  let mediaHtml = "";
  if (post.is_paid) {
    const waText = encodeURIComponent(
      `Hola Karen, quiero adquirir el acceso a "${post.title}" (${formatCOP(post.price)}).`
    );
    mediaHtml = `
      <div class="paid-box">
        <strong>🔒 Contenido privado de pago · ${formatCOP(post.price)}</strong>
        <p>Este material es exclusivo. Al realizar tu pago por WhatsApp, Karen habilitará tu acceso privado directamente.</p>
        <a class="btn btn-primary" href="https://wa.me/573184444573?text=${waText}" target="_blank" rel="noopener">Adquirir acceso por WhatsApp</a>
      </div>
    `;
  } else if (post.kind === "video_youtube" && post.media_url) {
    const embedUrl = getYoutubeEmbedUrl(post.media_url);
    mediaHtml = embedUrl
      ? `<div class="yt-frame"><iframe src="${escapeHtml(embedUrl)}" title="${escapeHtml(post.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
      : `<div class="ig-wrap"><a class="btn btn-primary" href="${escapeHtml(safeUrl(post.media_url))}" target="_blank" rel="noopener">Ver video en YouTube</a></div>`;
  } else if (post.kind === "video_archivo" && post.media_url) {
    mediaHtml = `
      <video class="video-player" controls playsinline preload="metadata">
        <source src="${escapeHtml(safeUrl(post.media_url))}">
        Tu navegador no soporta la reproducción de video.
      </video>
    `;
  } else if (post.kind === "video_instagram" && post.media_url) {
    const isPermalink = /instagram\.com\/(p|reel|tv)\//i.test(post.media_url);
    mediaHtml = `
      <div class="ig-wrap">
        ${
          isPermalink
            ? `<blockquote class="instagram-media" data-instgrm-permalink="${escapeHtml(post.media_url)}" data-instgrm-version="14" style="width:100%;max-width:540px;"></blockquote>`
            : ""
        }
        <a class="btn btn-primary" href="${escapeHtml(safeUrl(post.media_url))}" target="_blank" rel="noopener">Abrir en Instagram</a>
      </div>
    `;
  }

  body.innerHTML = `
    <span class="eyebrow">${kindLabel(post.kind)}</span>
    <h2 id="modal-title">${escapeHtml(post.title)}</h2>
    <p class="blog-date">${formatDate(post.created_at)}</p>
    ${
      safeUrl(post.cover_url) && post.kind === "escrito"
        ? `<img src="${escapeHtml(safeUrl(post.cover_url))}" alt="${escapeHtml(post.title)}" style="border-radius:14px;margin-top:14px;max-height:320px;width:100%;object-fit:cover;">`
        : ""
    }
    ${mediaHtml}
    ${post.content ? `<div class="modal-article">${escapeHtml(post.content)}</div>` : ""}
  `;

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  if (post.kind === "video_instagram" && !post.is_paid) {
    ensureInstagramEmbedScript();
  }
}

function closeModal() {
  $("#blog-modal").classList.add("hidden");
  $("#modal-body").innerHTML = "";
  document.body.style.overflow = "";
}

async function loadBlogPosts() {
  const cfg = window.SUPABASE_CONFIG || {};
  if (!cfg.url || !cfg.anonKey || !window.supabase) {
    state.posts = DEMO_POSTS;
    state.usingDemo = true;
    renderBlog();
    return;
  }

  try {
    const client = window.supabase.createClient(cfg.url, cfg.anonKey);
    const { data, error } = await client
      .from("blog_posts")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    state.posts = data || [];
    state.usingDemo = false;
  } catch (err) {
    console.warn("No se pudo cargar Supabase, usando ejemplos:", err.message);
    state.posts = DEMO_POSTS;
    state.usingDemo = true;
  }
  renderBlog();
}

function initEvents() {
  const navToggle = $("#nav-toggle");
  const siteNav = $("#site-nav");

  navToggle?.addEventListener("click", () => {
    const open = siteNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
  });

  siteNav?.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      siteNav.classList.remove("open");
      navToggle?.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("click", (e) => {
    const filterBtn = e.target.closest("[data-filter]");
    if (filterBtn) {
      state.filter = filterBtn.dataset.filter;
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.toggle("active", b === filterBtn));
      renderBlog();
      return;
    }

    const openBtn = e.target.closest("[data-open-post]");
    if (openBtn) {
      openPostModal(openBtn.dataset.openPost);
    }
  });

  $("#modal-close")?.addEventListener("click", closeModal);
  $("#modal-backdrop")?.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

initEvents();
loadBlogPosts();
