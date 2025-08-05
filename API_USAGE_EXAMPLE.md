# Treatment Plan API Test

## Endpoint
POST /api/patients/{patientId}/treatment-plans

## Example Request

### URL
```
POST http://localhost:8080/api/patients/1/treatment-plans
```

### Headers
```
Content-Type: application/json
```

### Request Body
```json
{
    "doctorId": 1,
    "diseaseId": 1,
    "status": "ongoing",
    "notes": "Patient should follow strict diet and exercise routine. Regular monitoring required.",
    "medicines": [
        {
            "medicineId": 1,
            "dosage": "500mg",
            "timing": "Twice a day after meals"
        },
        {
            "medicineId": 2,
            "dosage": "250mg",
            "timing": "Once daily before bedtime"
        }
    ]
}
```

### Expected Response (Success - 200 OK)
```json
{
    "treatmentId": 1,
    "patientId": 1,
    "doctorId": 1,
    "diseaseId": 1,
    "status": "ongoing",
    "startDate": "2025-07-31",
    "notes": "Patient should follow strict diet and exercise routine. Regular monitoring required.",
    "medicines": [
        {
            "treatmentMedID": 1,
            "medicineName": "Metformin",
            "dosage": "500mg",
            "timing": "Twice a day after meals"
        },
        {
            "treatmentMedID": 2,
            "medicineName": "Lisinopril",
            "dosage": "250mg",
            "timing": "Once daily before bedtime"
        }
    ]
}
```

### Error Responses

#### Patient Not Found (400 Bad Request)
```json
"Patient not found"
```

#### Internal Server Error (500 Internal Server Error)
```json
"Failed to create treatment plan: [error details]"
```

## Business Logic Flow

1. **Validate Patient**: Check if patient with given ID exists
2. **Create Treatment Plan**: 
   - Link patientId (from URL path)
   - Set doctorId, diseaseId, status, notes from request body
   - Set startDate to current date
   - Save to database and get generated treatmentId
3. **Create Treatment Medicines**:
   - For each medicine in the medicines array:
     - Create TreatmentMedicine record
     - Link to the created treatment plan
     - Set dosage and timing from request
     - Fetch medicine name using medicineId
     - Save to database
4. **Return Response**: Return complete treatment plan with all medicines

## cURL Example

```bash
curl -X POST http://localhost:8080/api/patients/1/treatment-plans \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": 1,
    "diseaseId": 1,
    "status": "ongoing",
    "notes": "Patient should follow strict diet and exercise routine.",
    "medicines": [
        {
            "medicineId": 1,
            "dosage": "500mg",
            "timing": "Twice a day after meals"
        }
    ]
  }'
```
