async function run() {
  console.log("Probando crear solicitud en pradera...");
  
  const res = await fetch("http://localhost:3000/api/v1/cases/general-request", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Host": "pradera.localhost:3000" },
    body: JSON.stringify({
      isAnonymous: false,
      citizen: {
        documentType: "CC",
        documentNumber: "123456789",
        firstName: "Test",
        lastName: "Pradera",
        email: "test@pradera.com",
        phone: "1234567890",
        address: "Calle 1",
        neighborhood: "El Centro",
        city: "Pradera",
        department: "Valle",
        dataConsent: true
      },
      subject: "Test bug in Pradera API",
      description: "Probando por que da error 500"
    })
  });
  
  const json = await res.json();
  console.log("Status:", res.status);
  console.log("Respuesta:", JSON.stringify(json, null, 2));
}

run().catch(console.error);
