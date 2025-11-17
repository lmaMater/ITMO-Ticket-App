from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class Location(BaseModel):
    id: int
    name: str
    city_id: int
    class Config:
        orm_mode = True

class Tag(BaseModel):
    id: int
    name: str
    class Config:
        orm_mode = True

class Event(BaseModel):
    id: int
    title: str
    description: str
    event_date: date
    location: Location
    tags: List[Tag] = []
    class Config:
        orm_mode = True
