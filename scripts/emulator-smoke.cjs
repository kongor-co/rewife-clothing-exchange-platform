const assert = require("node:assert/strict");

process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.GCLOUD_PROJECT = "demo-rewife";
process.env.GOOGLE_CLOUD_PROJECT = "demo-rewife";

const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

const projectId = "demo-rewife";
const app = initializeApp({ projectId });
const auth = getAuth(app);
const firestore = getFirestore(app);

async function readJson(response) {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function callFunction(name, idToken, data) {
  const response = await fetch(
    `http://127.0.0.1:5001/demo-rewife/europe-west3/${name}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${idToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ data }),
    },
  );
  return readJson(response);
}

async function run() {
  const suffix = Date.now();
  const email = `pilot-${suffix}@example.test`;
  const password = `Pilot-${suffix}-pass`;
  const displayName = "Pilot Tester";

  const user = await auth.createUser({
    displayName,
    email,
    emailVerified: true,
    password,
  });

  const signInResponse = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const signIn = await readJson(signInResponse);

  const onboarding = await callFunction("completeOnboarding", signIn.idToken, { displayName });

  assert.deepEqual(onboarding.result, { available: 10, reserved: 0 });

  const profile = await firestore.collection("users").doc(user.uid).get();
  const account = await firestore.collection("coinAccounts").doc(user.uid).get();
  const event = await firestore.collection("coinEvents").doc(`welcome_${user.uid}`).get();

  assert.equal(profile.get("displayName"), displayName);
  assert.equal(profile.get("status"), "ACTIVE");
  assert.equal(account.get("available"), 10);
  assert.equal(account.get("reserved"), 0);
  assert.equal(event.get("kind"), "WELCOME_ISSUED");

  const item = {
    title: "Smoke test shirt",
    category: "TOP",
    size: "M",
    condition: "GOOD",
    mainFabric: "COTTON",
    description: "A local emulator test garment.",
    compositionText: "100% cotton",
    imagePaths: [],
  };
  const draft = await callFunction("createDraft", signIn.idToken, item);
  const itemId = draft.result.itemId;
  const imagePath = `itemImages/${user.uid}/${itemId}/smoke.jpg`;
  const uploadUrl = new URL("http://127.0.0.1:9199/v0/b/demo-rewife.appspot.com/o");
  uploadUrl.searchParams.set("uploadType", "media");
  uploadUrl.searchParams.set("name", imagePath);
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${signIn.idToken}`,
      "content-type": "image/jpeg",
    },
    body: Buffer.from([255, 216, 255, 217]),
  });
  await readJson(uploadResponse);

  await callFunction("updateDraft", signIn.idToken, {
    itemId,
    item: { ...item, imagePaths: [imagePath] },
  });
  const published = await callFunction("publishItem", signIn.idToken, { itemId });
  assert.equal(published.result.status, "AVAILABLE");

  const savedItem = await firestore.collection("clothingItems").doc(itemId).get();
  assert.equal(savedItem.get("status"), "AVAILABLE");
  assert.deepEqual(savedItem.get("imagePaths"), [imagePath]);

  const claimantEmail = `claimant-${suffix}@example.test`;
  const claimantPassword = `Claimant-${suffix}-pass`;
  const claimant = await auth.createUser({
    displayName: "Pilot Claimant",
    email: claimantEmail,
    emailVerified: true,
    password: claimantPassword,
  });
  const claimantSignInResponse = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: claimantEmail,
        password: claimantPassword,
        returnSecureToken: true,
      }),
    },
  );
  const claimantSignIn = await readJson(claimantSignInResponse);
  await callFunction("completeOnboarding", claimantSignIn.idToken, {
    displayName: "Pilot Claimant",
  });

  const claim = await callFunction("claimItem", claimantSignIn.idToken, {
    itemId,
    operationId: crypto.randomUUID(),
    contactDisclosureConsent: true,
  });
  const exchangeId = claim.result.exchangeId;
  await callFunction("acceptExchange", signIn.idToken, {
    exchangeId,
    contactDisclosureConsent: true,
  });
  const contact = await callFunction("getExchangeContacts", claimantSignIn.idToken, {
    exchangeId,
  });
  assert.equal(contact.result.counterpartyEmail, email);
  await callFunction("confirmReceived", claimantSignIn.idToken, { exchangeId });

  const completedExchange = await firestore.collection("exchanges").doc(exchangeId).get();
  const completedItem = await firestore.collection("clothingItems").doc(itemId).get();
  const contributorAccount = await firestore.collection("coinAccounts").doc(user.uid).get();
  const claimantAccount = await firestore.collection("coinAccounts").doc(claimant.uid).get();
  assert.equal(completedExchange.get("status"), "COMPLETED");
  assert.equal(completedItem.get("status"), "EXCHANGED");
  assert.equal(contributorAccount.get("available"), 11);
  assert.equal(claimantAccount.get("available"), 9);
  assert.equal(claimantAccount.get("reserved"), 0);

  const hostingResponse = await fetch("http://127.0.0.1:5000");
  const hostingBody = await hostingResponse.text();
  assert.equal(hostingResponse.ok, true);
  assert.equal(hostingBody.includes("<title>rewife</title>"), true);

  console.log("Smoke test passed: the complete local exchange flow is connected.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
