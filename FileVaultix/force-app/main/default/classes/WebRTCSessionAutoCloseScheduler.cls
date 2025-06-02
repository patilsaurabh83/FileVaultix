/**
 * @class       WebRTCSessionAutoCloseScheduler
 * @description
 *   Schedulable Apex class to automate the execution of the WebRTCSessionAutoCloseBatch batch job.
 *   This scheduler allows you to run the batch periodically (e.g., hourly or daily) to ensure that
 *   stale WebRTC_Session__c records are automatically closed after 4 hours.
 *
 * @author      Saurabh Patil
 * @created     2025-06-02
 * @lastModified 2025-06-02
 * @lastModifiedBy Saurabh Patil
 */
global class WebRTCSessionAutoCloseScheduler implements Schedulable {
    global void execute(SchedulableContext sc) {
        WebRTCSessionAutoCloseBatch batch = new WebRTCSessionAutoCloseBatch();
        Database.executeBatch(batch, 200);
    }
}