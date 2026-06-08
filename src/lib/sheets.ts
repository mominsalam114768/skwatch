export const SHEET_ID = '1l9wm2yDDNHEe3Pp1ZYpaoQTAu-TRMIwdMDPv2R8NHGE';

export async function getSheetData(range: string, accessToken: string) {
  if (!accessToken) throw new Error("No token");
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?valueRenderOption=UNFORMATTED_VALUE`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to fetch ${range}: ${err}`);
  }
  const data = await res.json();
  return data.values || [];
}

export async function appendRow(range: string, values: any[][], accessToken: string) {
  if (!accessToken) throw new Error("No token");
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to append ${range}: ${err}`);
  }
  return await res.json();
}

export async function updateRow(range: string, values: any[][], accessToken: string) {
  if (!accessToken) throw new Error("No token");
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to update ${range}: ${err}`);
  }
  return await res.json();
}

export async function setupSpreadsheet(accessToken: string) {
  if (!accessToken) throw new Error("No token");
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error("Failed to get spreadsheet info");
  const data = await res.json();
  const existingTitles = data.sheets.map((s: any) => s.properties.title);

  const neededSheets = [
    { title: 'Customers', headers: ['id', 'name', 'phone', 'type', 'previous_due', 'current_due'] },
    { title: 'Transactions', headers: ['id', 'customer_id', 'customer_name', 'type', 'amount', 'details', 'date'] },
    { title: 'Stock', headers: ['id', 'product_name', 'unit', 'purchase_qty', 'total_purchase_price', 'current_stock'] },
    { title: 'Cashbox', headers: ['id', 'date', 'type', 'amount'] },
  ];

  const requests = [];
  for (const sheet of neededSheets) {
    if (!existingTitles.includes(sheet.title)) {
      requests.push({
        addSheet: { properties: { title: sheet.title } }
      });
    }
  }

  if (requests.length > 0) {
    const addRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests })
    });
    if (!addRes.ok) {
      console.error("Failed to batch update sheets");
    }
  }

  // After ensuring sheets exist, append the headers if they are empty
  for (const sheet of neededSheets) {
    try {
      const headerRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${sheet.title}!A1:Z1`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const headerData = await headerRes.json();
      if (!headerData.values || headerData.values.length === 0) {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${sheet.title}!A1:append?valueInputOption=USER_ENTERED`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [sheet.headers] })
        });
      }
    } catch(e) {
      console.error("Error setting headers for", sheet.title, e);
    }
  }
}
