const SITE_URLS = ["https://i.weread.qq.com", "https://weread.qq.com"]
const BATCH = 100

async function main(...args) {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  })
  if (tab?.url && SITE_URLS.some((url) => tab.url.startsWith(url))) {
    await sync(tab)
  } else {
    await openWeReadTab()
  }
}

async function sync(tab) {
  const msgEl = document.getElementsByClassName("msg")[0]
  msgEl.classList.remove("success", "failure")

  try {
    const vid = (await chrome.cookies.get({ name: "wr_vid", url: tab.url }))
      .value
    const {
      [`${vid}_booksSyncKey`]: booksSyncKey,
      [`${vid}_bookmarksSyncKey`]: bookmarksSyncKey,
      [`${vid}_reviewsSyncKey`]: reviewsSyncKey,
    } = await chrome.storage.sync.get({
      [`${vid}_booksSyncKey`]: "",
      [`${vid}_bookmarksSyncKey`]: "",
      [`${vid}_reviewsSyncKey`]: "",
    })

    msgEl.textContent = "获取数据……"
    const res = await chrome.tabs.sendMessage(tab.id, {
      op: "getData",
      args: [vid, booksSyncKey, bookmarksSyncKey, reviewsSyncKey],
    })
    if (res?.code !== 200) {
      return errorMsg(msgEl, res.code, res.err)
    }

    msgEl.textContent = "与Logseq同步中……"
    const syncDataRes = await syncData(res.data)
    if (syncDataRes?.code !== 200) {
      return errorMsg(msgEl, syncDataRes.code)
    }

    await chrome.storage.sync.set({
      [`${vid}_booksSyncKey`]: res.data.books.syncKey,
      [`${vid}_bookmarksSyncKey`]: res.data.bookmarks.syncKey,
      [`${vid}_reviewsSyncKey`]: res.data.reviews.syncKey,
    })
  } catch (err) {
    errorMsg(msgEl, 400, err)
  }

  msgEl.textContent = "完成"
  msgEl.classList.add("success")
}

async function syncData(data) {
  const { apiUrl, token } = await chrome.storage.local.get({
    apiUrl: "http://localhost:12315",
    token: "",
  })
  let res
  res = await syncRemoved(data, apiUrl, token)
  if (res.code !== 200) return res
  res = await syncBooks(data, apiUrl, token)
  if (res.code !== 200) return res
  res = await syncBookmarks(data, apiUrl, token)
  if (res.code !== 200) return res
  res = await syncReviews(data, apiUrl, token)
  if (res.code !== 200) return res
  return res
}

async function syncRemoved(data, apiUrl, token) {
  data = {
    books: {
      removed: data.books.removed,
      updated: [],
    },
    bookmarks: {
      removed: data.bookmarks.removed,
      updated: [],
    },
    reviews: {
      removed: data.reviews.removed,
      updated: [],
    },
  }
  return await syncCall(data, apiUrl, token)
}

async function syncBooks(data, apiUrl, token) {
  const batches = splitArray(data.books.updated, BATCH)
  let res
  for (const batch of batches) {
    data = {
      books: {
        removed: [],
        updated: batch,
      },
      bookmarks: {
        removed: [],
        updated: [],
      },
      reviews: {
        removed: [],
        updated: [],
      },
    }
    res = await syncCall(data, apiUrl, token)
    if (res.code !== 200) return res
  }
  return res
}

async function syncBookmarks(data, apiUrl, token) {
  const batches = splitArray(data.bookmarks.updated, BATCH)
  let res
  for (const batch of batches) {
    data = {
      books: {
        removed: [],
        updated: [],
      },
      bookmarks: {
        removed: [],
        updated: batch,
      },
      reviews: {
        removed: [],
        updated: [],
      },
    }
    res = await syncCall(data, apiUrl, token)
    if (res.code !== 200) return res
  }
  return res
}

async function syncReviews(data, apiUrl, token) {
  const batches = splitArray(data.reviews.updated, BATCH)
  let res
  for (const batch of batches) {
    data = {
      books: {
        removed: [],
        updated: [],
      },
      bookmarks: {
        removed: [],
        updated: [],
      },
      reviews: {
        removed: [],
        updated: batch,
      },
    }
    res = await syncCall(data, apiUrl, token)
    if (res.code !== 200) return res
  }
  return res
}

async function syncCall(data, apiUrl, token) {
  const res = await fetch(`${apiUrl}/api`, {
    method: "POST",
    credentials: "omit",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      method: "logseq.App.invokeExternalPluginCmd",
      args: ["logseq-weread-sync", "models", "receiveSyncData", [data]],
    }),
  })
  if (!res.ok) return { code: res.code }
  const ok = await res.json()
  if (!ok) return { code: 400 }
  return { code: 200 }
}

function splitArray(arr, n) {
  const ret = new Array(Math.ceil(arr.length / n))
  for (let i = 0; i < ret.length; i++) {
    ret[i] = arr.slice(i * n, (i + 1) * n)
  }
  return ret
}

function errorMsg(msgEl, code, err) {
  msgEl.classList.add("failure")
  switch (code) {
    case 401:
      msgEl.textContent = "请先登录微信读书"
      break
    default:
      msgEl.textContent = "同步失败"
      console.error(code, err)
      break
  }
}

async function openWeReadTab() {
  await chrome.tabs.create({ url: "https://weread.qq.com" })
}

document.addEventListener("DOMContentLoaded", main)
