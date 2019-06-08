import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();

function diff(newValue: Array<String>, previousValue: Array<String>) {
	return newValue.filter(function(i) {return previousValue.indexOf(i) < 0;});
};

export const helloWorld = functions.https.onRequest((request, response) => {
	response.send("Hello from Firebase!");
});

export const nodReceived = functions.firestore.document("/users/{userId}/nods/nodsReceived").onUpdate((change, context) => {
	let recipientId = context.params.userId
	let previousValue = change.before.data()
	let newValue = change.after.data()
	if (newValue) {
		var newNodsReceived = newValue.nodsReceived
	}
	if (previousValue) {
		var prevNodsReceived = previousValue.nodsReceived
	}
	let senderId = diff(newNodsReceived, prevNodsReceived)

	console.log("NEW NODS RECEIVED: " + newNodsReceived)
	console.log("PREVIOUS NODS RECEIVED: " + prevNodsReceived)
	
	console.log("PREVIOUS VALUE: " + JSON.stringify(previousValue));
	console.log("NEW VALUE: " + JSON.stringify(newValue));
	
	console.log("RECIPIENT ID: " + recipientId);
	console.log("SENDER ID: " + senderId);
})
