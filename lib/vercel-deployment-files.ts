import { Unzip, UnzipInflate, UnzipPassThrough } from 'fflate'

const maximumArchiveBytes = 50 * 1024 * 1024
const maximumUnpackedBytes = 100 * 1024 * 1024
const maximumFiles = 1000

export async function getVercelDeploymentFiles(
  archive: ArrayBuffer,
): Promise<Array<{ path: string; content: Uint8Array }>> {
  if (archive.byteLength > maximumArchiveBytes) {
    throw new Error('The generated project archive exceeds the 50 MB limit.')
  }

  return new Promise((resolve, reject) => {
    const files: Array<{ path: string; content: Uint8Array }> = []
    const activeFiles = new Set<{ terminate: () => void }>()
    let totalBytes = 0
    let failure: Error | undefined

    const fail = (error: Error) => {
      if (failure) return
      failure = error
      for (const file of activeFiles) file.terminate()
      activeFiles.clear()
    }

    const unzip = new Unzip((file) => {
      if (failure || file.name.endsWith('/')) return

      const normalizedPath = file.name.replace(/\\/g, '/')
      const pathSegments = normalizedPath.split('/')
      if (
        normalizedPath.startsWith('/') ||
        pathSegments.some(
          (segment) =>
            segment.includes(':') ||
            segment === '.' ||
            segment === '..' ||
            segment.includes('\0'),
        )
      ) {
        fail(new Error('The generated project archive contains an unsafe file path.'))
        return
      }

      const lowerPath = normalizedPath.toLowerCase()
      if (
        pathSegments.some(
          (segment) =>
            segment === '.git' ||
            segment === '.vercel' ||
            segment === 'node_modules' ||
            segment === '.next',
        ) ||
        pathSegments.some(
          (segment) =>
            segment.startsWith('.env') ||
            segment === '.npmrc' ||
            segment === '.pypirc' ||
            segment === '.netrc',
        ) ||
        /\.(pem|key)$/i.test(lowerPath)
      ) {
        return
      }

      if (files.length >= maximumFiles) {
        fail(new Error('The generated project exceeds the 1,000 file deployment limit.'))
        return
      }
      if (
        typeof file.originalSize === 'number' &&
        totalBytes + file.originalSize > maximumUnpackedBytes
      ) {
        fail(new Error('The generated project exceeds the 100 MB deployment limit.'))
        return
      }

      const chunks: Uint8Array[] = []
      let fileBytes = 0
      activeFiles.add(file)
      file.ondata = (error, chunk, final) => {
        if (error) {
          fail(new Error('The generated project archive could not be read.'))
          return
        }
        fileBytes += chunk.byteLength
        if (totalBytes + fileBytes > maximumUnpackedBytes) {
          fail(new Error('The generated project exceeds the 100 MB deployment limit.'))
          return
        }
        chunks.push(chunk)
        if (!final) return

        const content = new Uint8Array(fileBytes)
        let offset = 0
        for (const part of chunks) {
          content.set(part, offset)
          offset += part.byteLength
        }
        totalBytes += fileBytes
        files.push({ path: normalizedPath, content })
        activeFiles.delete(file)
      }

      try {
        file.start()
      } catch {
        fail(new Error('The generated project archive could not be read.'))
      }
    })
    unzip.register(UnzipInflate)
    unzip.register(UnzipPassThrough)

    try {
      unzip.push(new Uint8Array(archive), true)
    } catch {
      fail(new Error('The generated project archive could not be read.'))
    }

    if (failure) {
      reject(failure)
    } else if (files.length === 0) {
      reject(new Error('The generated project archive contains no deployable files.'))
    } else {
      resolve(files)
    }
  })
}
