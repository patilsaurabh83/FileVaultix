public without sharing class FileUploadController {

    @AuraEnabled
    public static String saveWebRTCSession(String peerId, String token, String password, String sessionJson) {
        if (String.isBlank(peerId) || String.isBlank(token) || String.isBlank(sessionJson)) {
            throw new AuraHandledException('peerId, token, and sessionJson are required.');
        }
        try {
            WebRTC_Session__c session = new WebRTC_Session__c(
                Peer_ID__c = peerId,
                Token__c = token,
                password__c = password,
                Session_Status__c = 'In Progress',
                Session_Data__c = sessionJson
            );
            insert session;
            return session.Id;
        } catch (Exception e) {
            throw new AuraHandledException('Error saving WebRTC session: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getWebRTCSession(String token) {
        Map<String, Object> response = new Map<String, Object>();

        if (String.isBlank(token)) {
            response.put('success', false);
            response.put('message', 'Token is required.');
            return response;
        }

        List<WebRTC_Session__c> sessions = [
            SELECT Id, Token__c, Session_Data__c
            FROM WebRTC_Session__c
            WHERE Token__c = :token
            AND Session_Status__c != 'Closed'
            LIMIT 1
        ];

        if (sessions.isEmpty()) {
            response.put('success', false);
            response.put('message', 'Invalid token. Session not found.');
            return response;
        }

        WebRTC_Session__c session = sessions[0];
        response.put('success', true);
        response.put('data', session.Session_Data__c);

        return response;
    }

    // @AuraEnabled
    // public static Boolean updateWebRTCSession(String token, String data) {
    //     try {
    //         // Query the existing session record using token
    //         WebRTC_Session__c session = [
    //             SELECT Id, Session_Data__c
    //             FROM WebRTC_Session__c
    //             WHERE Token__c = :token
    //             AND Session_Status__c != 'Closed'
    //             LIMIT 1
    //         ];

    //         // Update the session data
    //         session.Session_Data__c = data;
    //         update session;

    //         return true;
    //     } catch (Exception e) {
    //         System.debug('⚠️ Error updating session: ' + e.getMessage());
    //         return false;
    //     }
    // }


    @AuraEnabled
    public static void updateSessionStatus(String sessionToken, String status) {
        // Query the session record by token (assume field is Session_Token__c)
        List<WebRTC_Session__c> sessions = [
        SELECT Id, Session_Status__c, Session_End_Time__c
        FROM WebRTC_Session__c
        WHERE Token__c = :sessionToken
        AND Session_Status__c != 'Closed'
        LIMIT 1
        ];

        if (sessions.isEmpty()) {
        throw new AuraHandledException('Session not found for token: ' + sessionToken);
        }

        WebRTC_Session__c session = sessions[0];
        session.Session_Status__c = status;

        if (status == 'Closed') {
          session.Session_End_Time__c = System.now();
        }

        update session;
    }


    @AuraEnabled
    public static String generateUniqueToken() {
        String token;
        Boolean isUnique = false;

        Integer maxAttempts = 10;
        Integer attempts = 0;

        while (!isUnique && attempts < maxAttempts) {
            token = generateShortToken();
            Integer count = [SELECT COUNT() FROM WebRTC_Session__c WHERE Token__c = :token AND Session_Status__c != 'Closed' LIMIT 1];
            if (count == 0) {
                isUnique = true;
            } else {
                attempts++;
            }
        }

        if (!isUnique) {
            throw new AuraHandledException('Failed to generate a unique 6-char token after multiple attempts.');
        }

        return token;
    }

    private static String generateShortToken() {
        final String chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        String token = '';
        Integer length = 6;

        for (Integer i = 0; i < length; i++) {
            Integer index = Math.mod(Math.abs(Crypto.getRandomInteger()), chars.length());
            token += chars.substring(index, index + 1);
        }

        return token;
    }


}