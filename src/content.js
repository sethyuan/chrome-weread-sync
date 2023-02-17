async function getData(vid, booksSyncKey, bookmarksSyncKey, reviewsSyncKey) {
  try {
    const [shelfChanges, bookmarkChanges, reviewChanges] = await Promise.all([
      getBooks(vid, booksSyncKey),
      getBookmarks(bookmarksSyncKey),
      getReviews(reviewsSyncKey),
    ])
    return {
      code: 200,
      data: {
        books: {
          updated: await Promise.all(shelfChanges.books.map(getBookInfo)),
          removed: shelfChanges.removed,
          syncKey: shelfChanges.synckey,
        },
        bookmarks: {
          updated: bookmarkChanges.updated,
          removed: bookmarkChanges.removed,
          chapters: bookmarkChanges.chapters,
          syncKey: bookmarkChanges.synckey,
        },
        reviews: {
          updated: reviewChanges.reviews,
          removed: reviewChanges.removed,
          syncKey: reviewChanges.synckey,
        },
      },
    }
  } catch (err) {
    console.error(err)
    return { code: 400, err }
  }
}

async function getBooks(vid, syncKey) {
  return await getFetch(
    `https://i.weread.qq.com/shelf/sync?userVid=${vid}&synckey=${syncKey}`,
  )
}

async function getBookmarks(syncKey) {
  return await getFetch(
    `https://i.weread.qq.com/book/bookmarklist?synckey=${syncKey}`,
  )
}

async function getReviews(syncKey) {
  return await getFetch(
    `https://i.weread.qq.com/review/list?listType=11&listMode=0&mine=1&synckey=${syncKey}`,
  )
}

async function getBookInfo({ bookId }) {
  return await getFetch(`https://i.weread.qq.com/book/info?bookId=${bookId}`)
}

async function getFetch(url) {
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) throw res.code
  return await res.json()
}

chrome.runtime.onMessage.addListener(({ op, args }, sender, sendResponse) => {
  if (op === "getData") {
    getData(...args).then((ret) => {
      sendResponse(ret)
    })
  }
  return true
})
