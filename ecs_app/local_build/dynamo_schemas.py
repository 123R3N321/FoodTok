from dataclasses import dataclass
from enum import Enum
from typing import List, Dict, Optional


# TABLE NAMES___________________________________________________________
class DynamoTables(Enum):
    USERS = "Users"
    RESTAURANTS = "Restaurants"

# EXAMPLE USER TABLE___________________________________________________________
@dataclass
class UserRecord:
    userId: str
    firstName: str
    lastName: str
    email: str
    createdAt: str
    executionSocketUrl: Optional[str] = None
    chatSocketUrl: Optional[str] = None
    currentAssessmentTimestamp: Optional[str] = None