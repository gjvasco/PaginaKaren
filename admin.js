const $ = (s) => document.querySelector(s);
const cfg = window.SUPABASE_CONFIG || {};
const bucket = cfg.bucket || "blog-media";

let sb = null;
let editingPost = null;

function showMsg(text, isErr = false) {
  const el = $("#admin-msg");
  el.textContent = text;
  el.classList.remove("hidden", "err");
  if (isErr) el.classList.add("err");
}

function clearMsg() {
  $("#admin-msg").classList.add("hidden");
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toggleKindFields() {
  const kind = $("#post-kind").value;
  $("#field-video-file").style.display = kind === "video_archivo" ? "block" : "none";
  $("#field-ig-url").style.display = kind === "video_instagram" ? "block" : "none";
  $("#field-yt-url").style.display = kind === "video_youtube" ? "block" : "none";
}

function togglePaidField() {
  const isPaid = $("#post-is-paid").checked;
  $("#field-price").style.display = isPaid ? "block" : "none";
}

async function uploadToBucket(file, folder) {
  const ext = file.name.split(".").pop();
  const safeName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await sb.storage.from(bucket).upload(safeName, file, {
    cacheControl: "3600",
    upsert: false
  });
  if (error) throw error;
  const { data } = sb.storage.from(bucket).getPublicUrl(safeName);
  return data.publicUrl;
}

async function loadPosts() {
  const list = $("#admin-posts-list");
  const { data, error } = await sb
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    showMsg("Error al cargar publicaciones: " + error.message, true);
    return;
  }

  if (!data.length) {
    list.innerHTML = '<p style="color:var(--muted)">Aún no hay publicaciones.</p>';
    return;
  }

  list.innerHTML = data
    .map(
      (p) => `
      <div class="post-row">
        <div>
          <strong>${escapeHtml(p.title)}</strong>
          <div style="font-size:13px;color:var(--muted)">${escapeHtml(p.kind)} · ${new Date(p.created_at).toLocaleDateString("es-CO")}</div>
        </div>
        <div class="card-actions">
          <button class="btn btn-outline" data-edit="${p.id}">Editar</button>
          <button class="btn btn-outline" data-delete="${p.id}">Eliminar</button>
        </div>
      </div>
    `
    )
    .join("");

  list.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.onclick = () => startEdit(data.find((x) => x.id === btn.dataset.edit));
  });
  list.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.onclick = () => deletePost(btn.dataset.delete);
  });
}

function resetForm() {
  editingPost = null;
  $("#post-form").reset();
  $("#post-id").value = "";
  $("#post-is-paid").checked = false;
  $("#post-price").value = "";
  $("#current-video-note").textContent = "";
  $("#current-cover-note").textContent = "";
  $("#btn-save").textContent = "Publicar";
  $("#btn-cancel-edit").classList.add("hidden");
  toggleKindFields();
  togglePaidField();
}

function startEdit(post) {
  if (!post) return;
  editingPost = post;
  $("#post-id").value = post.id;
  $("#post-title").value = post.title;
  $("#post-kind").value = post.kind;
  $("#post-summary").value = post.summary;
  $("#post-content").value = post.content || "";
  $("#post-ig-url").value = post.kind === "video_instagram" ? post.media_url : "";
  $("#post-yt-url").value = post.kind === "video_youtube" ? post.media_url : "";
  $("#post-is-paid").checked = Boolean(post.is_paid);
  $("#post-price").value = post.price || "";
  $("#current-video-note").textContent =
    post.kind === "video_archivo" && post.media_url ? "Ya tiene un video cargado (sube otro solo si deseas reemplazarlo)." : "";
  $("#current-cover-note").textContent = post.cover_url ? "Ya tiene portada cargada." : "";
  $("#btn-save").textContent = "Guardar cambios";
  $("#btn-cancel-edit").classList.remove("hidden");
  toggleKindFields();
  togglePaidField();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deletePost(id) {
  if (!confirm("¿Seguro que quieres eliminar esta publicación?")) return;
  const { error } = await sb.from("blog_posts").delete().eq("id", id);
  if (error) {
    showMsg("No se pudo eliminar: " + error.message, true);
    return;
  }
  showMsg("Publicación eliminada.");
  loadPosts();
}

async function handleSubmit(e) {
  e.preventDefault();
  clearMsg();
  const btn = $("#btn-save");
  btn.disabled = true;
  btn.textContent = "Guardando...";

  try {
    const kind = $("#post-kind").value;
    const isPaid = $("#post-is-paid").checked;
    const price = isPaid ? Math.max(0, parseInt($("#post-price").value || "0", 10)) : 0;
    let mediaUrl = editingPost ? editingPost.media_url : "";
    let coverUrl = editingPost ? editingPost.cover_url : "";

    const coverFile = $("#post-cover-file").files[0];
    if (coverFile) {
      coverUrl = await uploadToBucket(coverFile, "covers");
    }

    if (kind === "video_archivo") {
      const videoFile = $("#post-video-file").files[0];
      if (videoFile) {
        mediaUrl = await uploadToBucket(videoFile, "videos");
      } else if (!mediaUrl && !isPaid) {
        throw new Error("Selecciona un archivo de video para subir.");
      }
    } else if (kind === "video_instagram") {
      mediaUrl = $("#post-ig-url").value.trim();
      if (!mediaUrl && !isPaid) throw new Error("Pega el enlace de Instagram.");
    } else if (kind === "video_youtube") {
      mediaUrl = isPaid ? "" : $("#post-yt-url").value.trim();
      if (!mediaUrl && !isPaid) throw new Error("Pega el enlace de YouTube.");
    } else {
      mediaUrl = "";
    }

    const payload = {
      title: $("#post-title").value.trim(),
      kind,
      summary: $("#post-summary").value.trim(),
      content: $("#post-content").value.trim(),
      media_url: mediaUrl,
      cover_url: coverUrl,
      is_paid: isPaid,
      price,
      published: true
    };

    if (editingPost) {
      const { error } = await sb.from("blog_posts").update(payload).eq("id", editingPost.id);
      if (error) throw error;
      showMsg("Publicación actualizada correctamente.");
    } else {
      const { error } = await sb.from("blog_posts").insert(payload);
      if (error) throw error;
      showMsg("¡Publicación creada y visible en el blog!");
    }

    resetForm();
    loadPosts();
  } catch (err) {
    showMsg(err.message || "Error al guardar.", true);
  } finally {
    btn.disabled = false;
    btn.textContent = editingPost ? "Guardar cambios" : "Publicar";
  }
}

async function checkSession() {
  const { data } = await sb.auth.getSession();
  const session = data.session;
  if (session) {
    $("#login-box").classList.add("hidden");
    $("#panel-box").classList.remove("hidden");
    $("#user-email").textContent = "Conectado como: " + session.user.email;
    loadPosts();
  } else {
    $("#login-box").classList.remove("hidden");
    $("#panel-box").classList.add("hidden");
  }
}

function init() {
  if (!window.supabase) {
    showMsg("No se pudo cargar la librería de Supabase (revisa tu conexión a internet).", true);
    return;
  }
  if (!cfg.url || !cfg.anonKey) {
    $("#setup-warning").classList.remove("hidden");
    return;
  }

  sb = window.supabase.createClient(cfg.url, cfg.anonKey);

  $("#post-kind").addEventListener("change", toggleKindFields);
  $("#post-is-paid").addEventListener("change", togglePaidField);
  $("#btn-cancel-edit").addEventListener("click", resetForm);
  $("#post-form").addEventListener("submit", handleSubmit);

  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMsg();
    const email = $("#login-email").value.trim();
    const password = $("#login-pass").value;
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      showMsg("Error de acceso: " + error.message, true);
      return;
    }
    checkSession();
  });

  $("#btn-logout").addEventListener("click", async () => {
    await sb.auth.signOut();
    checkSession();
  });

  toggleKindFields();
  togglePaidField();
  checkSession();
}

init();
