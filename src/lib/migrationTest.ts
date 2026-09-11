import { getDb, loadReportData, loadImage, deleteReport } from './storageV3'
import { createRapport } from './demo'

// 1x1 transparent PNG data URL for testing
const TEST_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

export interface TestResult {
  name: string
  passed: boolean
  error?: string
}

export async function runMigrationTestSuite(): Promise<TestResult[]> {
  const results: TestResult[] = []

  const test = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn()
      console.log(`[TEST PASS] ${name}`)
      results.push({ name, passed: true })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error(`[TEST FAIL] ${name}:`, errorMsg)
      results.push({ name, passed: false, error: errorMsg })
    }
  }

  console.log('==========================================')
  console.log('Starting V3.1 Migration & Database Test Suite')
  console.log('==========================================')

  const db = await getDb()

  // -------------------------------------------------------------------------
  // Test 1: Schema & Object Stores Verification
  // -------------------------------------------------------------------------
  await test('Object Stores and Indexes exist in IndexedDB', async () => {
    const storeNames = Array.from(db.objectStoreNames)
    if (!storeNames.includes('reportMeta')) throw new Error('Missing reportMeta store')
    if (!storeNames.includes('reportData')) throw new Error('Missing reportData store')
    if (!storeNames.includes('images')) throw new Error('Missing images store')
    if (!storeNames.includes('_migration')) throw new Error('Missing _migration store')

    const tx = db.transaction('reportMeta', 'readonly')
    const metaStore = tx.objectStore('reportMeta')
    const metaIndexes = Array.from(metaStore.indexNames)
    if (!metaIndexes.includes('by-updatedAt')) throw new Error('Missing by-updatedAt index')
    if (!metaIndexes.includes('by-createdAt')) throw new Error('Missing by-createdAt index')
    if (!metaIndexes.includes('by-studentName')) throw new Error('Missing by-studentName index')
    if (!metaIndexes.includes('by-companyName')) throw new Error('Missing by-companyName index')

    const imgTx = db.transaction('images', 'readonly')
    const imgStore = imgTx.objectStore('images')
    if (!imgStore.indexNames.contains('by-reportId')) throw new Error('Missing by-reportId index')
  })

  // -------------------------------------------------------------------------
  // Test 2: Report without images (Plain text)
  // -------------------------------------------------------------------------
  const textReportId = `test_text_${Date.now()}`
  await test('Store and read report with zero images', async () => {
    const testRapport = createRapport()
    testRapport.id = textReportId
    testRapport.couverture.nomStagiaire = 'Étudiant Test Zero Image'
    testRapport.entreprise.nom = 'Boulangerie Test'

    // Save into V3
    const tx = db.transaction(['reportData', 'reportMeta'], 'readwrite')
    tx.objectStore('reportData').put({
      id: testRapport.id,
      couverture: testRapport.couverture,
      entreprise: testRapport.entreprise,
      sections: testRapport.sections,
      images: {},
    })
    tx.objectStore('reportMeta').put({
      id: testRapport.id,
      createdAt: testRapport.createdAt,
      updatedAt: testRapport.updatedAt,
      studentName: testRapport.couverture.nomStagiaire,
      companyName: testRapport.entreprise.nom,
      periodeNumero: '1',
      sourceRecherche: null,
      progressDone: 5,
      progressTotal: 10,
    })
    await tx.done

    // Read back
    const meta = await db.get('reportMeta', textReportId)
    const data = await db.get('reportData', textReportId)

    if (!meta) throw new Error('Failed to retrieve reportMeta')
    if (!data) throw new Error('Failed to retrieve reportData')
    if (meta.studentName !== 'Étudiant Test Zero Image') throw new Error('studentName mismatch')
    if (Object.keys(data.images ?? {}).length !== 0) throw new Error('Expected empty images object')
  })

  // -------------------------------------------------------------------------
  // Test 3: Report with multiple images as Blobs
  // -------------------------------------------------------------------------
  const imgReportId = `test_img_${Date.now()}`
  let storedImageId1 = ''
  let storedImageId2 = ''

  await test('Store report with multiple image Blobs and references', async () => {
    storedImageId1 = `img_${crypto.randomUUID()}`
    storedImageId2 = `img_${crypto.randomUUID()}`

    // Create 2 test blobs
    const res1 = await fetch(TEST_PNG)
    const blob1 = await res1.blob()
    const res2 = await fetch(TEST_PNG)
    const blob2 = await res2.blob()

    // Store blobs in images store
    await db.put('images', {
      id: storedImageId1,
      reportId: imgReportId,
      blob: blob1,
      mimeType: 'image/png',
      width: 1,
      height: 1,
      size: blob1.size,
      createdAt: Date.now(),
    })

    await db.put('images', {
      id: storedImageId2,
      reportId: imgReportId,
      blob: blob2,
      mimeType: 'image/png',
      width: 1,
      height: 1,
      size: blob2.size,
      createdAt: Date.now(),
    })

    // Store reportData with lightweight references (NO BASE64)
    await db.put('reportData', {
      id: imgReportId,
      couverture: { nomStagiaire: 'Test Img Stagiaire' } as any,
      entreprise: { nom: 'Test Img Entreprise' } as any,
      sections: {},
      images: {
        presentation: [
          { id: 'img_ref_1', imageId: storedImageId1, side: 'right', size: 'M' },
        ],
        activites: [
          { id: 'img_ref_2', imageId: storedImageId2, side: 'left', size: 'L' },
        ],
      },
    })

    await db.put('reportMeta', {
      id: imgReportId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      studentName: 'Test Img Stagiaire',
      companyName: 'Test Img Entreprise',
      periodeNumero: '2',
      sourceRecherche: 'ia',
      progressDone: 3,
      progressTotal: 10,
    })

    // Verify
    const savedData = await loadReportData(imgReportId)
    if (!savedData) throw new Error('Missing reportData for image test')
    if (savedData.images?.presentation?.[0]?.imageId !== storedImageId1) {
      throw new Error('Image reference 1 mismatch')
    }
    if (savedData.images?.activites?.[0]?.imageId !== storedImageId2) {
      throw new Error('Image reference 2 mismatch')
    }

    // Verify blobs exist and have correct reportId
    const blobRecord1 = await loadImage(storedImageId1)
    const blobRecord2 = await loadImage(storedImageId2)
    if (!blobRecord1 || blobRecord1.reportId !== imgReportId) throw new Error('Blob 1 invalid')
    if (!blobRecord2 || blobRecord2.reportId !== imgReportId) throw new Error('Blob 2 invalid')
    if (blobRecord1.size === 0 || blobRecord2.size === 0) throw new Error('Blob size is zero')
  })

  // -------------------------------------------------------------------------
  // Test 4: Cascade deletion of Report + Data + Images
  // -------------------------------------------------------------------------
  await test('Cascade delete cleans up reportMeta, reportData, and images', async () => {
    await deleteReport(imgReportId)

    const meta = await db.get('reportMeta', imgReportId)
    const data = await db.get('reportData', imgReportId)
    const img1 = await db.get('images', storedImageId1)
    const img2 = await db.get('images', storedImageId2)

    if (meta) throw new Error('reportMeta was not deleted')
    if (data) throw new Error('reportData was not deleted')
    if (img1) throw new Error('Image blob 1 was not cascade deleted')
    if (img2) throw new Error('Image blob 2 was not cascade deleted')
  })

  // Clean up text report
  await deleteReport(textReportId)

  // -------------------------------------------------------------------------
  // Test 5: Idempotency & Resumability Check
  // -------------------------------------------------------------------------
  await test('Migration state tracking in _migration store is persistent', async () => {
    const state = {
      status: 'in_progress',
      startedAt: Date.now(),
      migratedReportIds: ['rep_1', 'rep_2'],
      failedReportIds: [],
      totalV1Reports: 2,
    }

    await db.put('_migration', state, 'test_migration_state')
    const retrieved = await db.get('_migration', 'test_migration_state')
    if (!retrieved || retrieved.status !== 'in_progress') throw new Error('Migration state not saved')
    if (retrieved.migratedReportIds.length !== 2) throw new Error('Migrated report IDs list mismatch')

    // Clean up test key
    await db.delete('_migration', 'test_migration_state')
  })

  console.log('==========================================')
  const passedCount = results.filter((r) => r.passed).length
  console.log(`Test Suite Finished: ${passedCount}/${results.length} PASSED`)
  console.log('==========================================')

  return results
}

// Expose globally in browser environment for testing in DevTools console
if (typeof window !== 'undefined') {
  ;(window as any).runMigrationTests = runMigrationTestSuite
}
