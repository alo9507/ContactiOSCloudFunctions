import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();

var db = admin.firestore()

export const nodReceived = functions.firestore.document("/users/{userId}/nodsReceived/{newNod}").onCreate((snap, context) => {
	let recipientId = context.params.userId
	let nod = snap.data()

	let senderId = ""
	let senderName = ""
	if (nod) {
		senderId = nod.senderId
		senderName = nod.senderName
	}

	let payload = {}
	logNodPNInfo(recipientId, senderId, nod);

	let recipientRef = db
		.collection('users')
		.doc(recipientId)

	const recipientNodsSentRef = db
		.collection('users')
		.doc(recipientId)
		.collection('nodsSent')

	recipientRef.get().then((userSnapshot) => {
		let fcmToken = ""
		let recipientUserData = userSnapshot.data()

		if (recipientUserData) {
			fcmToken = recipientUserData.fcmToken
			console.log(`Got FCMtoken ${fcmToken} for userId ${recipientId}`)
		}

		recipientNodsSentRef.listDocuments().then(nodsSentSnapshot => {
			var isAMutualNod: Boolean = false
			
			nodsSentSnapshot.forEach(doc => {
				if (doc.id == senderId) {
					isAMutualNod = true
				}
			});

			if (isAMutualNod) {
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

function logNodPNInfo(recipientId: any, senderId: String, nod: any) {
	console.log("RECIPIENT ID: " + recipientId);
	console.log("SENDER ID: " + senderId);
	console.log(JSON.stringify(nod))
}
