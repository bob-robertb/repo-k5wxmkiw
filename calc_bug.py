def calculate_average(numbers):
    # Severe bug: division by zero if empty list!
    return sum(numbers) / len(numbers)

def main():
    print(calculate_average([]))
