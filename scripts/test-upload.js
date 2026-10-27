const fs = require('fs');
const path = require('path');

async function testUpload() {
  console.log('Testing document upload to http://localhost:3000/api/jobs...');

  // Create sample valid PDF buffer
  const samplePdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Title (Sample CNIC Copy)\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF');

  const formData = new FormData();
  formData.append('customerName', 'Muhammad Ali');
  formData.append('notes', 'Print 2 copies in black and white on A4');
  
  const blob = new Blob([samplePdf], { type: 'application/pdf' });
  formData.append('files', blob, 'CNIC_Ali_Front.pdf');

  const res = await fetch('http://localhost:3000/api/jobs', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  console.log('Upload Response Status:', res.status);
  console.log('Upload Response Body:', JSON.stringify(data, null, 2));

  if (res.ok && data.success) {
    console.log('\nSUCCESS! Created Job ID:', data.job.id);

    // Verify job can be retrieved
    const getRes = await fetch(`http://localhost:3000/api/jobs/${data.job.id}`);
    const getData = await getRes.json();
    console.log('Verified Job retrieval:', getData.id, 'Files:', getData.files.length);

    // Verify file preview/download
    const fileId = getData.files[0].id;
    const fileRes = await fetch(`http://localhost:3000/api/jobs/${data.job.id}/files/${fileId}`);
    console.log('Verified File Download status:', fileRes.status, 'Type:', fileRes.headers.get('content-type'));

    // Verify ZIP archive download
    const zipRes = await fetch(`http://localhost:3000/api/jobs/${data.job.id}/zip`);
    console.log('Verified ZIP Download status:', zipRes.status, 'Type:', zipRes.headers.get('content-type'));
  } else {
    console.error('Upload failed:', data);
    process.exit(1);
  }
}

testUpload().catch(console.error);
