/**
 * @class       WebRTCSessionAutoCloseBatch
 * @description
 *   Batch Apex class to automatically close WebRTC_Session__c records in Salesforce.
 *   This batch job finds all WebRTC session records with a status of 'In Progress' that were created
 *   more than 4 hours ago, and updates their status to 'Closed' and sets the Session_End_Time__c to now.
 *   Intended to be scheduled to run periodically to ensure stale sessions are properly closed.
 *
 * @author      Saurabh Patil
 * @created     2025-06-02
 * @lastModified 2025-06-02
 * @lastModifiedBy Saurabh Patil
 */
global class WebRTCSessionAutoCloseBatch implements Database.Batchable<SObject>, Database.Stateful {

    global Database.QueryLocator start(Database.BatchableContext bc) {
        // Query sessions in progress and created more than 4 hours ago
        return Database.getQueryLocator([
            SELECT Id, Session_Status__c, CreatedDate, Session_End_Time__c
            FROM WebRTC_Session__c
            WHERE Session_Status__c = 'In Progress'
            AND CreatedDate <= :System.now().addHours(-4)
        ]);
    }

    global void execute(Database.BatchableContext bc, List<WebRTC_Session__c> scope) {
        List<WebRTC_Session__c> toUpdate = new List<WebRTC_Session__c>();
        for (WebRTC_Session__c session : scope) {
            session.Session_Status__c = 'Closed';
            session.Session_End_Time__c = System.now();
            toUpdate.add(session);
        }
        if (!toUpdate.isEmpty()) {
            update toUpdate;
        }
    }

    global void finish(Database.BatchableContext bc) {
        // Optional: Add notification or logging here
    }
}