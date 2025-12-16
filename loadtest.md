# Load Testing

## Quick Start

Run the complete workflow (deploy → test → destroy):

```bash
make deploy-test-destroy
```

Or, manually with your deployed backend:

```bash
make deploy
make load-test HOST=https://your-backend-url.elb.amazonaws.com
make destroy
```

---

## How to Run the Load Test

### Manual Execution

If you have a deployed backend, run:

```bash
make load-test HOST=https://your-backend-url.elb.amazonaws.com
```

Example with real output:

```bash
make load-test HOST=https://FoodTo-Backe-B0UpSeJiJmvD-1728432446.us-east-1.elb.amazonaws.com
```

This will run a 3-minute load test (60s ramp-up + 120s steady state) with up to 20 concurrent users and save results to `load_tests/results/`.

---

## Purpose

Validate that the application can handle up to 200 concurrent users performing realistic page-load traffic with no errors, acceptable median and P95 latency, and no signs of resource saturation or instability under sustained load.

---

## Background

This load test uses `locust.py` to simulate multiple concurrent users navigating the application and requesting multiple endpoints. This is not a stress test designed to push the system to failure. Instead, it is a focused load test intended to identify clear system design, performance, and scaling weaknesses under expected operating conditions.

---

## Methods

### Load Profile

- **Users:** ramped up to 200 concurrent users
- **Ramp-up time:** 60 seconds
- **Steady-state duration:** 120 seconds
- **Traffic shape:** realistic user behavior across multiple endpoints (not a single hot URL)

---

## Results

### Response Time Percentiles (Approximated)

```
Type     Name                            50%    66%    75%    80%    90%    95%    98%    99%  99.9% 99.99%   100% # reqs
--------|--------------------------|--------|------|------|------|------|------|------|------|------|------|------|------
GET      GET /                            34     44     56     68    110    150    240    410   1200   1200   1200   2660
GET      GET /favorites                   33     45     56     68    110    160    250    520   1200   1300   1300   1272
GET      GET /history                     33     44     57     68    110    160    250    450   1200   1200   1200   4009
GET      GET /login                       33     44     55     64    110    150    230    560   1200   1300   1300   2695
GET      GET /profile                     32     44     56     65    110    150    240    320   1200   1200   1200   1305
GET      GET /restaurant/<id>             55     92    140    180    320    440    620   1000   1600   1600   1600   5237
GET      GET /settings                    34     46     57     68    110    160    230    380   1200   1200   1200   1260
GET      GET /signup                      33     43     55     66    110    160    250    410   1200   1200   1200   2712
--------|--------------------------|--------|------|------|------|------|------|------|------|------|------|------|------
         Aggregated                       37     52     68     85    150    250    440    680   1400   1600   1600  21150
```

- **P95 latency:** < 440 ms
- **P99 latency:** ~1.6 s
- **Failures:** none observed at 200 concurrent users

---

### Request Statistics

```
Type     Name                    # reqs      # fails |    Avg     Min     Max    Med |   req/s  failures/s
--------|----------------------|-------|-------------|-------|-------|-------|-------|--------|-----------
GET      GET /                     2654     0(0.00%) |     58      12    1249     34 |   30.00        0.00
GET      GET /favorites            1266     0(0.00%) |     60      13    1251     34 |   14.40        0.00
GET      GET /history              4003     0(0.00%) |     60      11    1243     33 |   48.40        0.00
GET      GET /login                2689     0(0.00%) |     58      12    1253     33 |   32.00        0.00
GET      GET /profile              1301     0(0.00%) |     55      13    1222     32 |   14.60        0.00
GET      GET /restaurant/<id>      5222     0(0.00%) |    126      18    1618     56 |   62.30        0.00
GET      GET /settings             1259     0(0.00%) |     58      12    1189     34 |   12.60        0.00
GET      GET /signup               2700     0(0.00%) |     58      12    1246     33 |   29.10        0.00
--------|----------------------|-------|-------------|-------|-------|-------|-------|--------|-----------
         Aggregated               21094     0(0.00%) |     75      11    1618     37 |  243.40        0.00
```

---

## Interpretation

The primary performance bottleneck is the `/restaurant/<id>` endpoint. This is expected, as it is the only route that depends on an external API to populate data. Requests to `yelp.com` are driving tail latency, pushing P99 response times up to approximately 1.6 seconds.

Several mitigation strategies are available, including caching, background refresh of external data, or maintaining persistent connections to the external API. Addressing this endpoint would significantly reduce tail latency without impacting the rest of the application, which performs consistently and reliably under load.
