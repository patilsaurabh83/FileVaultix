/**
 * @class WebRTCCleanupScheduler
 * @description
 *   Schedulable Apex class to automate the scheduling of the WebRTCCleanupBatch job in Salesforce.
 *   This scheduler triggers the batch job that cleans up old WebRTC_Session__c records based on defined criteria.
 *
 *   The scheduler can be configured to run at the end of every month at 12 PM using Salesforce's Schedule Apex functionality,
 *   ensuring regular maintenance and cleanup of obsolete WebRTC session records.
 *
 * @author Saurabh Patil
 * @created 2024-06-08
 * @lastModified 2024-06-08
 * @lastModifiedBy Saurabh Patil
 *
 * @usage
 *   To schedule the cleanup job to run at the end of every month at 12 PM, use the Salesforce UI or execute the following in Anonymous Apex:
 *     String cronExp = '0 0 12 L * ?'; // At 12 PM on the last day of every month
 *     System.schedule('WebRTC Cleanup Monthly', cronExp, new WebRTCCleanupScheduler());
 *
 * @notes
 *   - Adjust the cron expression as per organizational requirements.
 *   - Ensure the WebRTCCleanupBatch class is deployed and functional.
 *   - This class is intended for scheduled execution only.
 */
global class WebRTCCleanupScheduler implements Schedulable {

    global void execute(SchedulableContext sc) {
        WebRTCCleanupBatch batch = new WebRTCCleanupBatch();
        Database.executeBatch(batch, 200); // Adjust batch size if needed
    }
}