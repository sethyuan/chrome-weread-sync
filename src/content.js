async function getData(vid, booksSyncKey, notesSyncKey) {
  try {
    const [shelfChanges, bookmarkChanges] = await Promise.all([
      getBooks(vid, booksSyncKey),
      getNotes(notesSyncKey),
    ])
    const bookIds = new Set(
      shelfChanges.books
        .concat(bookmarkChanges.books)
        .map(({ bookId }) => bookId),
    )
    const changedBooks = await Promise.all(
      Array.from(bookIds).map((id) => getBookData(id, bookmarkChanges)),
    )
    const removedBooks = shelfChanges.removed.map((book) => ({
      id: book.bookId,
      title: book.title,
      version: book.version,
    }))
    return {
      code: 200,
      data: {
        removedBooks,
        changedBooks,
        booksSyncKey: shelfChanges.synckey,
        notesSyncKey: bookmarkChanges.synckey,
      },
    }
  } catch (err) {
    return { code: 400, data: err }
  }
}

async function getBooks(vid, syncKey) {
  return await getFetch(
    `https://i.weread.qq.com/shelf/sync?userVid=${vid}&synckey=${syncKey}`,
  )
}

async function getNotes(syncKey) {
  return await getFetch(
    `https://i.weread.qq.com/book/bookmarklist?synckey=${syncKey}`,
  )
}

async function getBookData(id, bookmarkChanges) {
  const bookInfo = await getBookInfo(id)
  bookInfo.removedNotes = bookmarkChanges.removed.filter(
    ({ bookId }) => bookId === id,
  )
  bookInfo.changedNotes = bookmarkChanges.updated.filter(
    ({ bookId }) => bookId === id,
  )
  return bookInfo
}

async function getBookInfo(id) {
  return await getFetch(`https://i.weread.qq.com/book/info?bookId=${id}`)
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
