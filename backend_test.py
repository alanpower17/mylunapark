import requests
import sys
from datetime import datetime
import json

class LunaParkAPITester:
    def __init__(self, base_url="https://ciao-app-120.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.org_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_device_id = f"test_device_{datetime.now().strftime('%H%M%S')}"
        
        print(f"🧪 Testing Luna Park API at: {base_url}")
        print(f"🔧 Using device ID: {self.test_device_id}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, params=data or {})
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.text:
                    print(f"   Response: {response.text[:200]}")

            try:
                return success, response.json() if response.text else {}
            except:
                return success, {"raw_response": response.text}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def get_auth_headers(self, token=None):
        """Get authorization headers"""
        if not token:
            token = self.token
        return {'Authorization': f'Bearer {token}'} if token else {}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        success, response = self.run_test("API Root", "GET", "", 200)
        return success

    def test_seed_data(self):
        """Test seeding demo data"""
        success, response = self.run_test("Seed Demo Data", "POST", "seed", 200)
        return success

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST", 
            "auth/login",
            200,
            data={"email": "admin@lunapark.it", "password": "admin123"}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   🔑 Admin token acquired")
            return True
        return False

    def test_organizer_login(self):
        """Test organizer login"""
        success, response = self.run_test(
            "Organizer Login",
            "POST",
            "auth/login", 
            200,
            data={"email": "organizzatore@lunapark.it", "password": "org123"}
        )
        if success and 'token' in response:
            self.org_token = response['token']
            print(f"   🔑 Organizer token acquired")
            return True
        return False

    def test_get_luna_parks(self):
        """Test getting luna parks list"""
        success, response = self.run_test("Get Luna Parks", "GET", "lunaparks", 200)
        if success and isinstance(response, list):
            print(f"   📍 Found {len(response)} luna parks")
            return len(response) > 0, response
        return False, []

    def test_search_luna_parks(self):
        """Test searching luna parks"""
        success, response = self.run_test(
            "Search Luna Parks", 
            "GET", 
            "lunaparks", 
            200,
            data={"search": "Andora"}
        )
        return success

    def test_get_park_details(self, park_id):
        """Test getting park details"""
        success, response = self.run_test(
            "Get Park Details",
            "GET",
            f"lunaparks/{park_id}",
            200
        )
        return success, response

    def test_get_park_coupons(self, park_id):
        """Test getting park coupons"""
        success, response = self.run_test(
            "Get Park Coupons",
            "GET",
            f"lunaparks/{park_id}/coupons",
            200
        )
        if success and isinstance(response, list):
            print(f"   🎫 Found {len(response)} coupons")
            return len(response) > 0, response
        return False, []

    def test_coupon_availability(self, coupon_id):
        """Test checking coupon availability"""
        success, response = self.run_test(
            "Check Coupon Availability",
            "GET",
            f"coupons/{coupon_id}/check-availability",
            200,
            data={"device_id": self.test_device_id}
        )
        return success, response

    def test_use_coupon(self, coupon_id):
        """Test using a coupon"""
        success, response = self.run_test(
            "Use Coupon",
            "POST",
            f"coupons/{coupon_id}/use",
            200,
            data={"device_id": self.test_device_id}
        )
        return success, response

    def test_use_coupon_cooldown(self, coupon_id):
        """Test coupon cooldown - should fail second use"""
        success, response = self.run_test(
            "Use Coupon - Cooldown Check",
            "POST",
            f"coupons/{coupon_id}/use",
            200,  # API returns 200 with success: false for cooldown
            data={"device_id": self.test_device_id}
        )
        # Check if the response indicates cooldown
        if success and isinstance(response, dict):
            if not response.get('success', True):
                print(f"   ⏰ Cooldown working: {response.get('message', 'No message')}")
                return True
        return False

    def test_organizer_stats(self):
        """Test organizer stats"""
        success, response = self.run_test(
            "Organizer Stats",
            "GET",
            "organizer/stats",
            200,
            headers=self.get_auth_headers(self.org_token)
        )
        if success and isinstance(response, dict):
            print(f"   📊 Stats: {response}")
        return success

    def test_organizer_parks(self):
        """Test organizer parks"""
        success, response = self.run_test(
            "Organizer Parks",
            "GET", 
            "organizer/lunaparks",
            200,
            headers=self.get_auth_headers(self.org_token)
        )
        return success

    def test_admin_pending_parks(self):
        """Test admin pending parks"""
        success, response = self.run_test(
            "Admin Pending Parks",
            "GET",
            "admin/lunaparks/pending",
            200,
            headers=self.get_auth_headers(self.admin_token)
        )
        if success and isinstance(response, list):
            print(f"   ⏳ Pending parks: {len(response)}")
        return success

    def test_register_new_user(self):
        """Test registering a new user"""
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@test.com"
        success, response = self.run_test(
            "Register New User",
            "POST",
            "auth/register",
            200,
            data={
                "name": "Test User",
                "email": test_email,
                "password": "test123",
                "role": "cliente"
            }
        )
        return success

def main():
    # Setup
    tester = LunaParkAPITester()
    
    print("\n🚀 Starting Luna Park API Tests...")
    print("=" * 50)

    # Test basic endpoints
    if not tester.test_root_endpoint():
        print("❌ API not responding, stopping tests")
        return 1
    
    # Seed data first
    tester.test_seed_data()

    # Test authentication
    if not tester.test_admin_login():
        print("❌ Admin login failed, some tests will be skipped")
    
    if not tester.test_organizer_login():
        print("❌ Organizer login failed, some tests will be skipped")

    # Test public endpoints
    parks_success, parks_data = tester.test_get_luna_parks()
    if not parks_success:
        print("❌ No parks found, stopping coupon tests")
        return 1

    # Test search
    tester.test_search_luna_parks()

    # Test park details and coupons
    test_park = parks_data[0] if parks_data else None
    if test_park:
        park_success, park_data = tester.test_get_park_details(test_park['id'])
        coupons_success, coupons_data = tester.test_get_park_coupons(test_park['id'])
        
        # Test coupon flow
        if coupons_data and len(coupons_data) > 0:
            test_coupon = coupons_data[0]
            coupon_id = test_coupon['id']
            
            # Check availability
            avail_success, avail_data = tester.test_coupon_availability(coupon_id)
            
            # Use coupon first time
            use_success, use_data = tester.test_use_coupon(coupon_id)
            
            # Test cooldown
            if use_success and use_data.get('success'):
                tester.test_use_coupon_cooldown(coupon_id)

    # Test authenticated endpoints
    if tester.org_token:
        tester.test_organizer_stats()
        tester.test_organizer_parks()
    
    if tester.admin_token:
        tester.test_admin_pending_parks()

    # Test user registration
    tester.test_register_new_user()

    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Final Results:")
    print(f"   Tests run: {tester.tests_run}")
    print(f"   Tests passed: {tester.tests_passed}")
    print(f"   Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())