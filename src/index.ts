import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();

var db = admin.firestore()

function diff(newValue: Array<string>, previousValue: Array<string>): string {
	return newValue.filter(function (i) { return previousValue.indexOf(i) < 0; })[0];
};

export const nodReceived = functions.firestore.document("/users/{userId}/nods/nodsReceived").onUpdate((change, context) => {
	let recipientId = context.params.userId
	let previousValue = change.before.data()
	let newValue = change.after.data()
	if (newValue) {
		var newNodsReceived = newValue.nodsReceived;
	}
	if (previousValue) {
		var prevNodsReceived = previousValue.nodsReceived;
	}
	let senderId = diff(newNodsReceived, prevNodsReceived);
	let senderName = ""
	let payload = {}
	logNodPNInfo(newValue, previousValue, recipientId, senderId, newNodsReceived, prevNodsReceived);

	const senderRef = db
		.collection('users')
		.doc(senderId);

	let recipientRef = db
		.collection('users')
		.doc(recipientId)

	const recipientNodsSentRef = db
		.collection('users')
		.doc(recipientId)
		.collection('nods')
		.doc('nodsSent')

	recipientRef.get().then((userSnapshot) => {
		let fcmToken = ""
		let recipientUserData = userSnapshot.data()

		if (recipientUserData) {
			fcmToken = recipientUserData.fcmToken
			console.log(`Got FCMtoken ${fcmToken} for userId ${recipientId}`)
		}

		recipientNodsSentRef.get().then(nodsSentSnapshot => {
			var recipientNodsSent: Array<string> = []
			let nodsSentData = nodsSentSnapshot.data()
			if (nodsSentData) {
				recipientNodsSent = nodsSentData.nodsSent
			}

			senderRef.get().then((senderSnapshot) => {
				let senderUserData = senderSnapshot.data()

				if (senderUserData) {
					senderName = senderUserData.name
				}

				if (recipientNodsSent.includes(senderId)) {
					payload = {
						notification: {
							title: `${senderName} nodded back at you!`,
							body: "Start chatting!",
							sound: "default"
						}
					}
				} else {
					payload = {
						notification: {
							title: `${senderName} nodded at you!`,
							body: "Nod back?",
							sound: "default"
						},
						data: {
							senderId: senderId
						}
					}
				}

				return admin.messaging().sendToDevice(fcmToken, payload)
					.then(response => {
						console.log("RESPONSE FROM PUSH: " + JSON.stringify(response))
						console.log(`Nod Push Notification sent to ${fcmToken}`);
					})
					.catch(error => {
						console.log("Error while sending push notification: " + JSON.stringify(error))
					})
			})
		})
	})
})

export const messageReceived = functions.firestore
    .document('chats/{chatRoomId}/messages/{newMessage}')
    .onCreate((snap, context) => {
      const newValue = snap.data();
			let recipientRef
			let senderName: string
			let body: string

			if (newValue) {
				console.log("newValue is not null")
				 body = newValue.body
				 senderName = newValue.senderName
				 recipientRef = db
					.collection('users')
					.doc(newValue.recipient)
			}

			console.log(`Beginning Message Push Notification for ChatRoom ${context.params.chatRoomId} for messageId ${context.params.messageId}`)
			if (recipientRef) {
				console.log("recipientRef is not null")
				recipientRef.get()
					.then((userSnapshot: any) => {
						console.log("recipientRef.get was successful")
						let fcmToken = ""
						let recipientUserData = userSnapshot.data()
				
						if (recipientUserData) {
							fcmToken = recipientUserData.fcmToken
							console.log(`Got FCMtoken ${fcmToken} for recipient user ${recipientUserData.uid} of name ${recipientUserData.name}`)
						}
	
						let payload = {
							notification: {
								title: `${senderName}`,
								body: `${body}`,
								sound: "default"
							}
						}
	
						return admin.messaging().sendToDevice(fcmToken, payload)
							.then(response => {
								console.log("RESPONSE FROM PUSH: " + JSON.stringify(response))
								console.log(`MESSAGE Push Notification sent to ${fcmToken}`);
							})
							.catch(error => {
								console.log("Error while sending message notification: " + JSON.stringify(error))
							})
					})
			}
		})

function logNodPNInfo(newValue: FirebaseFirestore.DocumentData | undefined, previousValue: FirebaseFirestore.DocumentData | undefined, recipientId: any, senderId: String, newNodsReceived: any, prevNodsReceived: any) {
	console.log("NEW NODS RECEIVED: " + newNodsReceived);
	console.log("PREVIOUS NODS RECEIVED: " + prevNodsReceived);
	console.log("PREVIOUS VALUE: " + JSON.stringify(previousValue));
	console.log("NEW VALUE: " + JSON.stringify(newValue));
	console.log("RECIPIENT ID: " + recipientId);
	console.log("SENDER ID: " + senderId);
}
