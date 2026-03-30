const archiveList = document.getElementById("archiveList");
const categoryFilter = document.getElementById("categoryFilter");
const sortOrder = document.getElementById("sortOrder");

// 1. 【セキュリティ・最適化】許可するカテゴリを厳格に定義（ホワイトリスト）
const ALLOWED_CATEGORIES = ["神社", "お寺", "観光", "山梨グルメ"];

// 日付フォーマット
function formatPublishedDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "日付未設定";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

// 2. 【最適化】カテゴリ選択肢の生成（HTMLの動的解析をやめ、固定リストを使用）
function buildCategoryOptions() {
  categoryFilter.innerHTML = '<option value="all">すべて</option>';
  ALLOWED_CATEGORIES.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category; // textContentの使用でXSS防止
    categoryFilter.appendChild(option);
  });
}

// 3. 【セキュリティ】URLパスのサニタイズ（ディレクトリトラバーサルや不正スキーム対策）
function sanitizePath(path) {
  // 英数字、ハイフン、アンダースコア、ドット、スラッシュのみ許可
  const safePath = path.replace(/[^a-zA-Z0-9\-_\.\/]/g, "");
  return encodeURI(safePath);
}

// フィルタリングとソートを適用して描画
function renderPosts(allPosts) {
  const selectedCategory = categoryFilter.value;
  const mode = sortOrder.value;

  // カテゴリでフィルタリング
  const filtered = allPosts.filter((post) => {
    if (selectedCategory === "all") return true;
    return post.categories.includes(selectedCategory);
  });

  // ソートを実行
  filtered.sort((a, b) => {
    const aTime = a.visitDate ? a.visitDate.getTime() : 0;
    const bTime = b.visitDate ? b.visitDate.getTime() : 0;
    return mode === "old" ? aTime - bTime : bTime - aTime;
  });

  // HTMLへの描画
  archiveList.innerHTML = "";

  if (filtered.length === 0) {
    const li = document.createElement("li");
    li.className = "empty-item";
    li.textContent = "該当する記事はありません。";
    archiveList.appendChild(li);
    return;
  }

  filtered.forEach((post) => {
    const li = document.createElement("li");
    const link = document.createElement("a");
    
    // セキュアにパスを設定（javascript: などの不正実行を防止）
    link.href = `../html/${sanitizePath(post.path)}`;
    link.textContent = `・${post.title} (訪問日：${formatPublishedDate(post.visitDate)})`;
    
    li.appendChild(link);
    archiveList.appendChild(li);
  });
}

// HTMLからデータを抽出（ホワイトリストによる検証）
function loadPostDataFromList() {
  const items = Array.from(archiveList.querySelectorAll("li[data-visit-date]"));
  
  return items.map((item) => {
    const dateText = item.dataset.visitDate || "";
    const title = item.dataset.title || ""; // render時にtextContentで扱うため安全
    const path = item.dataset.path || "";
    
    // 4. 【セキュリティ】HTML側の記述ミスや改ざんを防ぐため、許可リストにあるカテゴリのみ抽出
    const categories = (item.dataset.categories || "")
      .split(",")
      .map((value) => value.trim())
      .filter((category) => ALLOWED_CATEGORIES.includes(category));

    const visitDate = dateText ? new Date(dateText) : null;
    return { title, path, categories, visitDate };
  });
}

function initListPage() {
  try {
    // 最初にセレクトボックスを構築
    buildCategoryOptions();
    
    // データをロード
    const allPosts = loadPostDataFromList();
    
    // 初回描画
    renderPosts(allPosts);

    // イベントリスナーの登録
    categoryFilter.addEventListener("change", () => renderPosts(allPosts));
    sortOrder.addEventListener("change", () => renderPosts(allPosts));
    
  } catch (error) {
    console.error("Initialization error:", error);
    archiveList.innerHTML = '<li class="empty-item">記事一覧の読み込みに失敗しました。</li>';
  }
}

// 実行
initListPage();